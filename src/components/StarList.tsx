import React, { useState, useMemo, useCallback } from "react";
import { Input, Select, Space, Loading, Button, MessagePlugin } from "tdesign-react";
import { useAppStore } from "../stores/app";
import { StarCard } from "./StarCard";
import { LabelSelect, NO_LABEL_ID } from "./LabelSelect";
import { chat, ChatResponse } from "../api/server";
import { FilterPanel, AdvancedFilter } from "./FilterPanel";
import { BatchActions } from "./BatchActions";

type SortBy = "updated" | "name" | "stars";

export const StarList: React.FC = () => {
  const { stars, loadingStars, labels, getRepoLabels, batchMode, selectedRepos } = useAppStore();
  const [search, setSearch] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  
  // 高级筛选状态
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter | null>(null);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  
  // 智能匹配相关状态
  const [smartQuery, setSmartQuery] = useState("");
  const [isSmartMatching, setIsSmartMatching] = useState(false);
  const [smartMatchedRepos, setSmartMatchedRepos] = useState<string[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // 清除智能匹配结果
  const clearSmartMatch = useCallback(() => {
    setSmartMatchedRepos([]);
    setSmartQuery("");
  }, []);

  // 智能匹配处理
  const handleSmartMatch = useCallback(async () => {
    if (!smartQuery.trim()) {
      MessagePlugin.warning("请输入查询内容");
      return;
    }

    if (stars.length === 0) {
      MessagePlugin.warning("暂无项目数据");
      return;
    }

    setIsSmartMatching(true);
    
    try {
      // 构建项目列表文档
      const projectDocs = stars.slice(0, 100).map(repo => {
        const repoLabels = getRepoLabels(repo.full_name);
        const labelNames = repoLabels
          .map(id => labels.find(l => l.id === id)?.name)
          .filter(Boolean)
          .join(", ");
        
        return [
          `项目：${repo.full_name}`,
          repo.description ? `描述：${repo.description}` : null,
          repo.language ? `语言：${repo.language}` : null,
          labelNames ? `标签：${labelNames}` : null,
        ].filter(Boolean).join(" | ");
      });

      const query = `请从以下项目中找出与"${smartQuery}"最相关的项目。返回项目名称列表（owner/repo格式），每行一个，最多返回20个。如果找不到相关项目，返回"无"。

项目列表：
${projectDocs.join("\n")}`;

      const response: ChatResponse = await chat({
        message: query,
        session_id: sessionId,
      });

      // 解析响应，提取项目名称
      const lines = response.reply.split("\n").map((line: string) => line.trim()).filter(Boolean);
      const matchedNames: string[] = [];
      
      for (const line of lines) {
        // 尝试匹配 owner/repo 格式
        const match = line.match(/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/);
        if (match && stars.some(s => s.full_name === match[1])) {
          matchedNames.push(match[1]);
        }
      }

      if (matchedNames.length === 0) {
        // 如果没有匹配到，可能返回的是项目名称
        for (const line of lines) {
          const found = stars.find(s => 
            s.full_name.toLowerCase().includes(line.toLowerCase()) ||
            s.name.toLowerCase() === line.toLowerCase()
          );
          if (found && !matchedNames.includes(found.full_name)) {
            matchedNames.push(found.full_name);
          }
        }
      }

      if (matchedNames.length === 0) {
        MessagePlugin.info("未找到匹配的项目");
        setSmartMatchedRepos([]);
      } else {
        setSmartMatchedRepos(matchedNames);
        MessagePlugin.success(`找到 ${matchedNames.length} 个相关项目`);
      }
    } catch (error) {
      console.error("Smart match error:", error);
      MessagePlugin.error("智能匹配失败，请确保后端服务正在运行（http://localhost:8080）");
    } finally {
      setIsSmartMatching(false);
    }
  }, [smartQuery, stars, labels, getRepoLabels, sessionId]);

  const filteredStars = useMemo(() => {
    let result = [...stars];

    // 智能匹配结果优先
    if (smartMatchedRepos.length > 0) {
      result = result.filter(repo => smartMatchedRepos.includes(repo.full_name));
    }

    // 标签筛选
    if (selectedLabels.length > 0) {
      const hasNoLabel = selectedLabels.includes(NO_LABEL_ID);
      const regularLabelIds = selectedLabels.filter((id) => id !== NO_LABEL_ID);

      result = result.filter((repo) => {
        const repoLabelIds = getRepoLabels(repo.full_name);

        // 如果选择了"未设标签"
        if (hasNoLabel) {
          // 只显示未设标签的仓库
          if (repoLabelIds.length > 0) {
            return false;
          }
          return true;
        }

        // 普通标签筛选（必须包含所有选中的标签）
        if (regularLabelIds.length > 0) {
          return regularLabelIds.every((labelId) =>
            repoLabelIds.includes(labelId)
          );
        }

        return true;
      });
    }

    // 语言筛选
    if (selectedLanguage) {
      result = result.filter((repo) => repo.language === selectedLanguage);
    }

    // 搜索筛选（搜索仓库名和介绍）
    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter((repo) => {
        return (
          repo.full_name.toLowerCase().includes(keyword) ||
          repo.description?.toLowerCase().includes(keyword)
        );
      });
    }

    // 应用高级筛选
    if (advancedFilter) {
      result = result.filter((repo) => {
        // Stars 数量筛选
        if (repo.stargazers_count < advancedFilter.starsMin) {
          return false;
        }
        if (repo.stargazers_count > advancedFilter.starsMax) {
          return false;
        }

        // 更新时间筛选
        const updatedDate = new Date(repo.updated_at);
        const now = new Date();
        const diffDays = Math.floor(
          (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays > advancedFilter.updatedDays) {
          return false;
        }

        return true;
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.full_name.localeCompare(b.full_name);
        case "stars":
          return b.stargazers_count - a.stargazers_count;
        case "updated":
        default:
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
      }
    });

    return result;
  }, [stars, search, selectedLabels, selectedLanguage, sortBy, smartMatchedRepos, getRepoLabels, advancedFilter]);

  // 提取所有语言并生成选项
  const languageOptions = useMemo(() => {
    const languages = new Set<string>();
    stars.forEach((repo) => {
      if (repo.language) {
        languages.add(repo.language);
      }
    });
    return Array.from(languages)
      .sort()
      .map((lang) => ({ label: lang, value: lang }));
  }, [stars]);

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        {/* 智能匹配行 */}
        <div
          style={{
            marginBottom: "12px",
            padding: "12px",
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", color: "#666", minWidth: "80px" }}>
              智能匹配：
            </span>
            <Input
              placeholder="输入需求，如：找一个 React 状态管理库"
              value={smartQuery}
              onChange={(value) => setSmartQuery(value)}
              style={{ flex: 1 }}
              onEnter={handleSmartMatch}
            />
            <Button
              theme="primary"
              onClick={handleSmartMatch}
              loading={isSmartMatching}
            >
              匹配
            </Button>
            {smartMatchedRepos.length > 0 && (
              <Button variant="outline" onClick={clearSmartMatch}>
                清除结果
              </Button>
            )}
          </div>
          {smartMatchedRepos.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#2BA47D" }}>
              已筛选出 {smartMatchedRepos.length} 个相关项目
            </div>
          )}
        </div>

        {/* 第一行：筛选和排序 */}
        <div
          style={{
            marginBottom: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Space>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666", width: "60px", display: "inline-block", textAlign: "right" }}>
                排序：
              </span>
              <Select
                value={sortBy}
                onChange={(value) => setSortBy(value as SortBy)}
                style={{ width: "120px" }}
                options={[
                  { label: "最近更新", value: "updated" },
                  { label: "名称", value: "name" },
                  { label: "星标数", value: "stars" },
                ]}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666", width: "60px", display: "inline-block", textAlign: "right" }}>
                标签：
              </span>
              <LabelSelect
                value={selectedLabels}
                onChange={setSelectedLabels}
                labels={labels}
                placeholder="筛选标签"
                style={{ minWidth: "150px", maxWidth: "400px" }}
                showNoLabelOption={true}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666", width: "60px", display: "inline-block", textAlign: "right" }}>
                语言：
              </span>
              <Select
                value={selectedLanguage}
                onChange={(value) => setSelectedLanguage(value as string)}
                placeholder="全部"
                clearable
                style={{ width: "150px" }}
                options={[{ label: "全部", value: "" }, ...languageOptions]}
              />
            </div>
            {/* 高级筛选按钮 */}
            <Button
              variant={showAdvancedFilter ? "base" : "outline"}
              theme={showAdvancedFilter ? "primary" : "default"}
              size="small"
              onClick={() => setShowAdvancedFilter(true)}
            >
              高级筛选
            </Button>
          </Space>
          <span style={{ color: "#666" }}>共 {filteredStars.length} 个</span>
        </div>

        {/* 第二行：搜索 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#666", width: "60px", display: "inline-block", textAlign: "right" }}>
            搜索：
          </span>
          <Input
            placeholder="搜索项目..."
            value={search}
            onChange={(value) => setSearch(value)}
            style={{ width: "300px" }}
          />
        </div>
      </div>

      {loadingStars ? (
        <Loading text="加载中..." />
      ) : filteredStars.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          {stars.length === 0 ? "暂无 Stars，请先同步" : "没有匹配的项目"}
        </div>
      ) : (
        filteredStars.map((repo) => (
          <StarCard key={repo.full_name} repo={repo} />
        ))
      )}

      {/* 批量操作工具栏 */}
      {batchMode && selectedRepos.length > 0 && (
        <BatchActions selectedCount={selectedRepos.length} />
      )}

      {/* 高级筛选面板 */}
      <FilterPanel
        visible={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        filter={advancedFilter}
        onFilterChange={setAdvancedFilter}
      />
    </div>
  );
};
