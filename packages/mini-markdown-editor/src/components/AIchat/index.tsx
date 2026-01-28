import { Divider, Modal,Input, message, Form} from "antd";
import React, { useState,useEffect,useRef } from "react";
import styled from "styled-components";
import { callAIModelWithHistory } from "./api";


const ChatContainer = styled.div`
  height: 100%;
  padding: 10px;
  border-left: 1px solid ${(props) => props.theme.borderColor};
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.background};
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
`;

const InputArea = styled.div`
  display: flex;
  gap: 10px;
`;

const Inputs = styled.input`
  flex: 1;
  padding: 5px;
  border: 1px solid ${(props) => props.theme.borderColor};
  border-radius: 4px;
`;

// 修改按钮样式，使用16进制颜色
const Button = styled.button<{ isActive: boolean }>`
  padding: 5px 10px;
  background-color: ${(props) => props.isActive ? '#007bff' : '#ccc'}; 
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: ${(props) => props.isActive ? 'pointer' : 'not-allowed'};
`;



const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'user' | 'ai'}[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // 添加加载状态
  const [showConfigModal, setShowConfigModal] = useState<boolean>(true);
  const [modelConfig, setModelConfig] = useState({
    name: 'gpt-3.5-turbo',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    customHeaders: {}
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 初始化ID计数器
  let messageIdCounter = Date.now();



  // 检查本地存储中的配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('ai_model_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setModelConfig(parsed);
        setShowConfigModal(false);
      } catch (e) {
        console.error('解析配置失败:', e);
        setShowConfigModal(true);
      }
    } else {
      setShowConfigModal(true);
    }
     // 加载历史消息
     const savedMessages = sessionStorage.getItem('ai_chat_session');
     if (savedMessages) {
       try {
         const parsedMessages = JSON.parse(savedMessages);
         setMessages(parsedMessages);
       } catch (e) {
         console.error('解析聊天记录失败:', e);
         setMessages([]);
       }
     } else {
       setMessages([]);
     }
  }, []);

  // 监听消息变化，保存到sessionStorage
  useEffect(() => {
    sessionStorage.setItem('ai_chat_session', JSON.stringify(messages));
  }, [messages]);


  // 在 messages 更新后滚动到底部
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

  const handleSend = async () => {
    if (!modelConfig.apiKey) {
        setShowConfigModal(true);
        return;
      }
  
    if (input.trim() && !isLoading) {
      const userMessageId = ++messageIdCounter;
      setMessages(prev => [...prev, { id: userMessageId, text: input, sender: 'user' }]);
      setInput("");
      setIsLoading(true);

      try {
          // 构建对话历史
        const conversationHistory = [
            ...messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' as 'user' : 'assistant' as 'assistant',
            content: msg.text
            })),
            { role: 'user' as 'user', content: input } // 当前输入的消息
        ];
        const response = await callAIModelWithHistory(conversationHistory, {
            name: modelConfig.name,
            endpoint: modelConfig.endpoint,
            model: modelConfig.name,
            apiKey: modelConfig.apiKey,
            headers: modelConfig.customHeaders
          });
          
          const aiMessageId = ++messageIdCounter;
          setMessages(prev => [...prev, { id: aiMessageId, text: response, sender: 'ai' }]);
      } catch (error: any) {
        console.error("AI调用错误:", error);
        const errorMessageId = ++messageIdCounter;
        setMessages(prev => [
          ...prev, 
          { id: errorMessageId, text: `AI服务错误: ${error.message || '未知错误'}`, sender: 'ai' }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const saveConfig = () => {
    if (!modelConfig.apiKey) {
      message.warning('请输入API密钥');
      return;
    }
    
    if (!modelConfig.endpoint) {
      message.warning('请输入API端点');
      return;
    }
    
    localStorage.setItem('ai_model_config', JSON.stringify(modelConfig));
    setShowConfigModal(false);
    message.success('配置已保存！');
  };

  const handleConfigChange = (field: keyof typeof modelConfig, value: any) => {
    setModelConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ChatContainer>
      {/* 配置弹窗 */}
      <Modal
        title="AI模型配置"
        open={showConfigModal}
        onCancel={() => {}}
        footer={null}
        maskClosable={false}
      >
        <Form layout="vertical">
          <Form.Item label="模型名称">
            <Input
              placeholder="例如: gpt-3.5-turbo 或 自定义名称"
              value={modelConfig.name}
              onChange={(e) => handleConfigChange('name', e.target.value)}
            />
          </Form.Item>
          
          <Form.Item label="API端点">
            <Input
              placeholder="例如: https://api.openai.com/v1/chat/completions"
              value={modelConfig.endpoint}
              onChange={(e) => handleConfigChange('endpoint', e.target.value)}
            />
          </Form.Item>
          
          <Form.Item label="API密钥">
            <Input.Password
              placeholder="输入您的API密钥"
              value={modelConfig.apiKey}
              onChange={(e) => handleConfigChange('apiKey', e.target.value)}
            />
          </Form.Item>
          
          <Form.Item label="自定义请求头 (可选)">
            <Input.TextArea
              rows={3}
              placeholder='例如: {"X-Custom-Header": "value"}'
              value={JSON.stringify(modelConfig.customHeaders, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleConfigChange('customHeaders', parsed);
                } catch (err) {
                  // 忽略无效的JSON
                }
              }}
            />
          </Form.Item>
        </Form>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <Button onClick={saveConfig} isActive={!!(modelConfig.apiKey && modelConfig.endpoint)}>
            保存并开始聊天
          </Button>
        </div>
      </Modal>

      <Messages>
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`} style={{
            textAlign: msg.sender === 'user' ? 'right' : 'left',
            padding: '8px 12px',
            margin: '5px 0',
            backgroundColor: msg.sender === 'user' ? '#e3f2fd' : '#f5f5f5',
            borderRadius: '8px',
            maxWidth: '80%',
            wordWrap: 'break-word'
          }}>
            {msg.sender === 'user' ? (
            <>
                {msg.text} <strong>:我</strong>
            </>
            ) : (
            <>
                <strong>{modelConfig.name}:</strong> {msg.text}
            </>
            )}            
          </div>
        ))}
        {isLoading && (
          <div style={{
            textAlign: 'left',
            padding: '8px 12px',
            margin: '5px 0',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            maxWidth: '80%'
          }}>
            AI正在思考...
          </div>
        )}
        <div ref={messagesEndRef} />
      </Messages>
      <Divider />
      <InputArea style={{ alignItems: 'center' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          flex: 1,
          gap: '10px'
        }}>
          <span 
            style={{ 
              whiteSpace: 'nowrap',
              fontSize: '14px',
              color: '#666'
            }}
            title={`${modelConfig.name} (${modelConfig.endpoint})`}
          >
        模型
          </span>
          <Inputs
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); 
                handleSend(); 
              }
            }}
            placeholder="向AI提问..."
            disabled={isLoading}
            style={{ flex: 1, padding: '8px' }}
          />
        </div>
        <Button 
          onClick={handleSend} 
          isActive={!!input.trim() && !isLoading && !!modelConfig.apiKey}
          disabled={isLoading}
        >
          {isLoading ? '发送中...' : '发送'}
        </Button>
      </InputArea>
    </ChatContainer>
  );
};

export default AIChat;
