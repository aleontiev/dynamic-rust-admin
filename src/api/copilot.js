import axios from "axios";
import { COPILOT_URL, API_URL } from "../config";

export const getChatHistory = async (token, tenantApiUrl = API_URL) => {
  return await axios.get(`${COPILOT_URL}/chat/history`, {
    params: { tenant_api_url: tenantApiUrl },
    headers: { Authorization: `jwt ${token}` },
  });
};

export const chat = async (data, token, tenantApiUrl = API_URL) => {
  return await axios
    .post(`${COPILOT_URL}/chat`, data, {
      params: { tenant_api_url: tenantApiUrl },
      headers: {
        "Content-Type": "application/json",
        Authorization: `jwt ${token}`,
      },
    })
    .catch((error) => {
      console.log(error);
    });
};

export const createConversation = async (data, token, tenantApiUrl = API_URL) => {
  return await axios.post(`${COPILOT_URL}/conversations`, data, {
    params: { tenant_api_url: tenantApiUrl },
    headers: {
      "Content-Type": "application/json",
      Authorization: `jwt ${token}`,
    },
  });
};

export const listConversations = async (token, tenantApiUrl = API_URL) => {
  return await axios.get(`${COPILOT_URL}/conversations`, {
    params: { tenant_api_url: tenantApiUrl },
    headers: { Authorization: `jwt ${token}` },
  });
};

export const getConversation = async (conversationId, token, tenantApiUrl = API_URL) => {
  return await axios.get(`${COPILOT_URL}/conversations/${conversationId}`, {
    params: { tenant_api_url: tenantApiUrl },
    headers: { Authorization: `jwt ${token}` },
  });
};

export const getConversationHistory = async (conversationId, token, tenantApiUrl = API_URL) => {
  return await axios.get(
    `${COPILOT_URL}/conversations/${conversationId}/history`,
    {
      params: { tenant_api_url: tenantApiUrl },
      headers: { Authorization: `jwt ${token}` },
    }
  );
};
