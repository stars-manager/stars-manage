import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button, MessagePlugin } from "tdesign-react";
import { ChatSender } from "@tdesign-react/chat";
import { useAppStore } from "../stores/app";
import { chat, ChatResponse } from "../api/server";

interface SmartMatcherProps {
  onReposMatched: (repos?: string[]) => void;
  onClear: () => void;
}

export const SmartMatcher: React.FC<SmartMatcherProps> = ({ onReposMatched, onClear }) => {
  const { stars, labels, getRepoLabels } = useAppStore();
  const [inputValue, setInputValue] = useState("");
  const [matchedRepos, setMatchedRepos] = useState<string[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [matchedRepos]);

  // 智能匹配处理
  const handleSmartMatch = useCallback(async (query: string) => {
    if (!query.trim()) {
      MessagePlugin.warning("请输入查询内容");
      return;
    }

    if (stars.length === 0) {
      MessagePlugin.warning("暂无项目数据");
      return;
    }
    
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

      const chatQuery = `请从以下项目中找出与"${query}"最相关的项目。返回项目名称列表（owner/repo格式），每行一个，最多返回20个。如果找不到相关项目，返回"无"。

项目列表：
${projectDocs.join("\n")}`;

      const response: ChatResponse = await chat({
        message: chatQuery,
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
        setMatchedRepos([]);
        onReposMatched([]);
      } else {
        setMatchedRepos(matchedNames);
        onReposMatched(matchedNames);
        MessagePlugin.success(`找到 ${matchedNames.length} 个相关项目`);
      }
    } catch (error) {
      console.error("Smart match error:", error);
      MessagePlugin.error("智能匹配失败，请确保后端服务正在运行（http://localhost:8080）");
    }
  }, [stars, labels, getRepoLabels, sessionId, onReposMatched]);

  const handleClear = useCallback(() => {
    setMatchedRepos([]);
    setInputValue("");
    onClear();
  }, [onClear]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  // ChatSender 提交事件处理
  const handleSend = (e: unknown) => {
    const event = e as CustomEvent<{ value: string }>;
    const query = event.detail.value;
    if (query.trim()) {
      handleSmartMatch(query);
    }
  };

  return (
    <div
      style={{
        marginBottom: "16px",
        padding: "16px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "12px",
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "16px", fontWeight: 600 }}>🤖 AI 思考助手</span>
        <span style={{ fontSize: "12px", opacity: 0.8 }}>输入你的需求，让 AI 帮你分析和总结</span>
      </div>

      {/* 结果展示区 */}
      {matchedRepos.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "12px",
            maxHeight: "200px",
            overflowY: "auto",
            borderLeft: "3px solid rgba(255,255,255,0.3)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#fff", lineHeight: 1.8 }}>
            <div style={{ marginBottom: "8px", fontWeight: 600 }}>✓ 找到 {matchedRepos.length} 个相关项目：</div>
            {matchedRepos.map((repo, idx) => (
              <div key={idx} style={{ color: "#f0f0f0" }}>
                {idx + 1}. {repo}
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 输入区域 - 使用 TDesign ChatSender */}
      <div style={{ marginBottom: "12px" }}>
        <ChatSender
          value={inputValue}
          placeholder="输入需求，如：找一个 React 状态管理库"
          onChange={(e: unknown) => {
            const event = e as CustomEvent<{ value: string }>;
            handleInputChange(event.detail.value);
          }}
          onSend={handleSend}
        />
      </div>

      {/* 清除结果按钮 */}
      {matchedRepos.length > 0 && (
        <div style={{ display: "flex" }}>
          <Button
            variant="outline"
            onClick={handleClear}
            style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff", width: "100%" }}
          >
            清除结果
          </Button>
        </div>
      )}
    </div>
  );
};
