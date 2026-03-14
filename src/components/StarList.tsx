import React, { useState, useMemo } from "react";
import { Select, Loading, Button, Input, Dialog } from "tdesign-react";
import { useAppStore } from "../stores/app";
import { StarCard } from "./StarCard";
import { LabelSelect, NO_LABEL_ID } from "./LabelSelect";
import { SmartMatcher } from "./SmartMatcher";
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
  
  // 思考助手状态
  const [showSmartMatcher, setShowSmartMatcher] = useState(false);
  
  // 筛选器折叠状态
  const [filterExpanded, setFilterExpanded] = useState(true);

  const filteredStars = useMemo(() => {
    let result = [...stars];

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

    // 模糊搜索
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
  }, [stars, search, selectedLabels, selectedLanguage, sortBy, getRepoLabels, advancedFilter]);

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
      {/* 筛选和搜索区 */}
      <div 
        style={{ 
          marginBottom: "16px",
          background: "#fff",
          borderRadius: "8px",
          padding: "16px",
          border: "1px solid #e7e7e7",
        }}
      >
        {/* 折叠按钮 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: filterExpanded ? "16px" : "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "16px", fontWeight: 600 }}>筛选</span>
            <span style={{ 
              padding: "4px 12px", 
              background: "#e7f3ff", 
              color: "#0052cc", 
              borderRadius: "12px",
              fontSize: "13px" 
            }}>
              {filteredStars.length} 个项目
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Button
              variant="outline"
              size="small"
              onClick={() => setShowSmartMatcher(true)}
              title="使用 AI 思考和总结，帮助你找到最适合的项目"
            >
              💡 思考助手
            </Button>
            <Button 
              variant="text" 
              size="small"
              onClick={() => setFilterExpanded(!filterExpanded)}
              style={{ color: "#666" }}
            >
              {filterExpanded ? "收起" : "展开"} {filterExpanded ? "↑" : "↓"}
            </Button>
          </div>
        </div>

        {filterExpanded && (
          <>
            {/* 搜索框 */}
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666", minWidth: "60px" }}>搜索：</span>
              <Input
                placeholder="输入项目名称或描述进行模糊搜索..."
                value={search}
                onChange={(value) => setSearch(value)}
                clearable
                style={{ flex: 1 }}
              />
            </div>

            {/* 筛选行：标签、语言和排序 */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "200px" }}>
                <LabelSelect
                  value={selectedLabels}
                  onChange={setSelectedLabels}
                  labels={labels}
                  placeholder="筛选标签"
                  style={{ flex: 1 }}
                  showNoLabelOption={true}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "150px" }}>
                <Select
                  value={selectedLanguage}
                  onChange={(value) => setSelectedLanguage(value as string)}
                  placeholder="全部语言"
                  clearable
                  style={{ minWidth: "120px" }}
                  options={[{ label: "全部", value: "" }, ...languageOptions]}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", color: "#666" }}>排序：</span>
                <Select
                  value={sortBy}
                  onChange={(value) => setSortBy(value as SortBy)}
                  style={{ width: "140px" }}
                  options={[
                    { label: "最近更新", value: "updated" },
                    { label: "名称", value: "name" },
                    { label: "星标数", value: "stars" },
                  ]}
                />
              </div>
              <Button
                variant={showAdvancedFilter ? "base" : "outline"}
                theme={showAdvancedFilter ? "primary" : "default"}
                size="small"
                onClick={() => setShowAdvancedFilter(true)}
              >
                高级筛选
              </Button>
            </div>
          </>
        )}
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

      {/* 思考助手弹窗 */}
      <Dialog
        header="💡 思考助手"
        visible={showSmartMatcher}
        onClose={() => setShowSmartMatcher(false)}
        width="700px"
        dialogClassName="smart-matcher-dialog"
      >
        <div style={{ padding: "12px 0", maxHeight: "600px", overflowY: "auto" }}>
          <SmartMatcher
            onReposMatched={() => {
              // 关闭对话框
              setShowSmartMatcher(false);
            }}
            onClear={() => {}}
          />
        </div>
      </Dialog>
    </div>
  );
};
