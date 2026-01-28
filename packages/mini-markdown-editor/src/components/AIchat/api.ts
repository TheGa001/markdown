interface CustomModelConfig {
    name: string;
    endpoint: string;
    model: string;
    apiKey: string;
    headers?: Record<string, string>;
  }
  
//无历史对话调用AI模型的函数（与下面的函数有重合代码）
  const callAIModel = async (
    userMessage: string,
    config: CustomModelConfig
  ): Promise<string> => {
    try {
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
  
      // 如果提供了apiKey，添加认证头
      if (config.apiKey) {
        // 根据端点类型决定认证头格式
        if (config.endpoint.includes('openai') || config.endpoint.includes('openrouter')) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        } else if (config.endpoint.includes('anthropic')) {
          headers['x-api-key'] = config.apiKey;
          headers['anthropic-version'] = '2023-06-01';
        }else if (config.endpoint.includes('dashscope')) {
            // 通义千问(DashScope)API
            headers['Authorization'] = `Bearer ${config.apiKey}`;
            headers['Content-Type'] = 'application/json';
        }else {
          // 默认使用Bearer token
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
      }
  
      let requestBody;
      
      // 根据端点类型构建请求体
      if (config.endpoint.includes('openai') || config.endpoint.includes('openrouter')) {
        requestBody = JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.7,
        });
      } else if (config.endpoint.includes('anthropic')) {
        requestBody = JSON.stringify({
          model: config.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: userMessage }],
        });
      }else if (config.endpoint.includes('dashscope')) {
        // 通义千问API格式
        requestBody = JSON.stringify({
          model: config.model,
          input: {
            messages: [
              { role: 'user', content: userMessage }
            ]
          },
          parameters: {
            temperature: 0.7,
          }
        });
      }
       else {
        // 对于其他API，使用通用格式
        requestBody = JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: userMessage }],
          max_tokens: 500,
        });
      }
  
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: requestBody,
      });
  
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} - ${await response.text()}`);
      }
  
      const data = await response.json();
  
     // 解析响应数据
    if (config.endpoint.includes('openai') || 
    config.endpoint.includes('openrouter') ||
    config.endpoint.includes('siliconflow') ||
    config.endpoint.includes('lingyiwanwu')) {
    return data.choices?.[0]?.message?.content || 
        data.choices?.[0]?.text || 
        "无法获取AI回复";
    } else if (config.endpoint.includes('anthropic')) {
    return data.content?.[0]?.text || "无法获取AI回复";
    } else if (config.endpoint.includes('dashscope')) {
    // 通义千问API响应格式
    return data.output?.text || 
        data.result?.output?.text || 
        data.output?.finish_reason || 
        "无法获取AI回复";
    } else {
    // 通用响应格式
    return data.text || data.response || "无法获取AI回复";
    }
    } catch (error) {
      console.error('Error calling AI model:', error);
      throw error; // 重新抛出错误以便上层处理
    }
  };


// 新增支持历史对话的函数
interface Message {
    role: 'user' | 'assistant';
    content: string;
  }
  
  const callAIModelWithHistory = async (
    conversationHistory: Message[],
    config: CustomModelConfig
  ): Promise<string> => {
    try {
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
  
      // 如果提供了apiKey，添加认证头
      if (config.apiKey) {
        if (config.endpoint.includes('openai') || config.endpoint.includes('openrouter')) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        } else if (config.endpoint.includes('anthropic')) {
          headers['x-api-key'] = config.apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else if (config.endpoint.includes('dashscope')) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
          headers['Content-Type'] = 'application/json';
        } else {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
      }
  
      let requestBody;
      
      // 根据端点类型构建请求体，包含完整对话历史
      if (config.endpoint.includes('openai') || config.endpoint.includes('openrouter')) {
        requestBody = JSON.stringify({
          model: config.model,
          messages: conversationHistory,
          temperature: 0.7,
        });
      } else if (config.endpoint.includes('anthropic')) {
        // Anthropic 需要确保第一条消息是用户消息
        const anthropicMessages = [...conversationHistory];
        if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
          anthropicMessages.unshift({ role: 'user', content: '让我们继续我们的对话。' });
        }
        requestBody = JSON.stringify({
          model: config.model,
          max_tokens: 1024,
          messages: anthropicMessages,
        });
      } else if (config.endpoint.includes('dashscope')) {
        // 通义千问API格式，包含对话历史
        requestBody = JSON.stringify({
          model: config.model,
          input: {
            messages: conversationHistory
          },
          parameters: {
            temperature: 0.7,
          }
        });
      } else {
        // 通用格式
        requestBody = JSON.stringify({
          model: config.model,
          messages: conversationHistory,
          max_tokens: 500,
        });
      }
  
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: requestBody,
      });
  
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} - ${await response.text()}`);
      }
  
      const data = await response.json();
  
      // 解析响应数据，与原函数相同
      if (config.endpoint.includes('openai') || 
      config.endpoint.includes('openrouter') ||
      config.endpoint.includes('siliconflow') ||
      config.endpoint.includes('lingyiwanwu')) {
        return data.choices?.[0]?.message?.content || 
            data.choices?.[0]?.text || 
            "无法获取AI回复";
      } else if (config.endpoint.includes('anthropic')) {
        return data.content?.[0]?.text || "无法获取AI回复";
      } else if (config.endpoint.includes('dashscope')) {
        return data.output?.text || 
            data.result?.output?.text || 
            data.output?.finish_reason || 
            "无法获取AI回复";
      } else {
        return data.text || data.response || "无法获取AI回复";
      }
    } catch (error) {
      console.error('Error calling AI model with history:', error);
      throw error;
    }
  };
  
  export { callAIModel, callAIModelWithHistory };