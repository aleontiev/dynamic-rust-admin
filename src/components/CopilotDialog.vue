<style lang="scss">
.q-message.q-message-sent img.q-message-avatar {
  object-fit: contain;
  border: 3px solid var(--q-primary);
}

.q-message.q-message-received img.q-message-avatar {
  padding-right: 20px;
  object-fit: contain;
}

.grouped-msg.grouped-msg--continued {
  margin-top: -6px;
}

.grouped-msg.grouped-msg--continued .q-message-avatar {
  visibility: hidden;
}

.thinking-indicator {
  padding: 4px 16px 12px 60px;
  display: flex;
  align-items: center;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
}

.preview-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.q-field.dragging .q-field__control:before {
  border-color: var(--q-primary);
  border-width: 2px;
}

.conversation-sidebar {
  width: 280px;
  border-right: 1px solid var(--q-separator-color);
  background: var(--q-card-color);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;

  @media (max-width: 768px) {
    position: relative;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 2000;
    transform: translateX(-100%);
    background: var(--q-card-color);
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.2);

    &.sidebar-open {
      transform: translateX(0);
    }
  }
}

.conversation-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--q-separator-color);
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--q-hover-color);
  }

  &.active {
    background-color: var(--q-primary);
    color: white;
  }
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.conversation-time {
  font-size: 12px;
  opacity: 0.7;
}

.new-chat-button {
  margin: 16px;
  width: calc(100% - 32px);
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.messages-container {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--q-text-color);
  opacity: 0.7;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1999;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;

  &.overlay-visible {
    opacity: 1;
    visibility: visible;
  }
}

.sidebar-toggle {
  display: flex;
  position: absolute;
  left: 8px;
  top: 60px;
  z-index: 12;
  background: var(--q-card-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--q-separator-color);
  min-width: 40px;
  min-height: 40px;
}

.sidebar-header {
  border-bottom: 1px solid var(--q-separator-color);
  background: var(--q-card-color);
}

.copilot-drawer-overlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  z-index: 2000;
  opacity: 1;
  transition: opacity 0.3s;
}

.copilot-drawer {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 280px;
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.18);
  z-index: 2001;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(.4, 0, .2, 1);
  transform: translateX(-100%);
}

.copilot-drawer.open {
  transform: translateX(0);
}

.copilot-drawer-search {
  padding: 12px 16px 0 16px;
}

.copilot-drawer-menu {
  padding: 8px 0 0 0;
}

.copilot-drawer-chats {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 0 0;
}

.copilot-drawer-action {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 16px;
  color: var(--q-text-color);
  border: none;
  background: none;
  width: 100%;
  transition: background 0.2s;
}

.copilot-drawer-action:hover {
  background: var(--q-hover-color);
}

.copilot-drawer-chat-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 15px;
  color: var(--q-text-color);
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.2s;
}

.copilot-drawer-chat-item.active,
.copilot-drawer-chat-item:active {
  background: var(--q-primary);
  color: #fff;
}

.copilot-drawer-searchbar {
  width: 100%;
}

@media (max-width: 600px) {
  .copilot-drawer {
    width: 90vw;
    min-width: 0;
    max-width: 100vw;
  }
}
</style>
<template>
  <q-dialog v-model="isOpen" :class="{ dense, 'right large': true, fullheight: true }" transition-show="slide-up"
    transition-hide="slide-down" :maximized="dense" position="bottom" @show="onDialogShow" @dragover.prevent="onDragEnter"
    @dragenter="onDragEnter" @dragleave="onDragLeave" @drop.prevent="onDrop">
    <q-card :class="{ 'q-pb-xl': dense, 'overflow-hidden': true }" style="display: flex; height: 100%;">
      <!-- Sidebar Overlay & Drawer -->
      <div v-if="sidebarOpen">
        <div class="copilot-drawer-overlay" @click="closeSidebar" />
        <nav class="copilot-drawer open" :style="{ background: dark ? '#111' : '#fff' }">
          <div class="copilot-drawer-search">
            <q-input dense outlined placeholder="Search" v-model="searchQuery" class="copilot-drawer-searchbar">
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="copilot-drawer-menu" :style="{ background: dark ? '#111' : '#fff' }">
            <button class="copilot-drawer-action" @click="startNewChat">
              <q-icon name="add" class="q-mr-sm" /> New chat
            </button>
          </div>
          <div class="copilot-drawer-chats">
            <div v-for="conversation in filteredConversations" :key="conversation.id"
              :class="['copilot-drawer-chat-item', { active: currentConversationId === conversation.id }]"
              @click="loadConversation(conversation.id)">
              {{ conversation.title }}
            </div>
          </div>
        </nav>
      </div>
      <!-- Chat Area -->
      <div class="chat-container" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
        <q-toolbar :class="toolbarClasses" style="z-index: 11; top: 0px">
          <q-btn flat round dense icon="menu" @click="toggleSidebar" />
          <q-toolbar-title>
            {{ currentConversation?.title || 'New Conversation' }}
          </q-toolbar-title>
          <q-btn flat round dense icon="close" aria-label="Close dialog" @click="closeDialog" />
        </q-toolbar>
        <q-card-section :class="sectionClasses" :style="sectionStyle">
          <div class="q-pt-md row justify-center" style="height: calc(100% - 20px); overflow: hidden">
            <div v-if="!currentConversationId" class="empty-state">
              <q-icon name="mdi-chat-outline" class="empty-state-icon" />
              <div class="text-h6">Start a new conversation</div>
              <div class="text-body2">Ask me anything or upload an image to get started</div>
            </div>
            <q-scroll-area v-else class="q-pb-lg messages-container" style="height: 100%; width: 100%" ref="scrollArea">
              <q-chat-message v-for="(msg, index) in messages" :key="index"
                :name="isGroupStart(index) ? msg.name : undefined"
                :avatar="isGroupStart(index) ? msg.avatar : undefined"
                :text="[msg.text]" :stamp="msg.timestamp
                  ? getRelativeTimeLabel(msg.timestamp, {
                    dense: false,
                    addSuffix: true,
                  })
                  : null
                  " :sent="msg.sent" :bg-color="msg.sent ? sentColor : receivedColor"
                :text-color="dark ? 'white' : 'black'"
                :class="['grouped-msg', { 'grouped-msg--continued': !isGroupStart(index) }]"
                style="max-width: 100%">
                <template v-slot:default>
                  <img style="
                      object-fit: contain;
                      max-width: 200px;
                      max-height: 500px;
                    " v-if="msg?.file" :src="msg.file" fit="contain" />
                  <div v-html="msg.text"></div>
                </template>
              </q-chat-message>
              <div v-if="isLoading" class="thinking-indicator">
                <q-spinner-dots size="2rem" :color="dark ? 'white' : 'grey-7'" />
              </div>
            </q-scroll-area>
          </div>
        </q-card-section>
        <div :class="bottomBarClasses">
          <ActionBar :dark="dark" right padded>
            <div class="col">
              <div v-if="previewImage" class="preview-container">
                <q-btn flat round dense icon="close" aria-label="Close dialog" @click="clearImage" />
                <img :src="previewImage" style="max-height: 200px; max-width: 200px" class="preview-image" />
              </div>
              <div class="row q-pa-sm">
                <div class="col">
                  <q-input v-model="userInput" :class="{ 'full-width': true, dragging: isDragging }" outlined rounded
                    ref="inputRef"
                    placeholder="Type your question or request..."
                    @keyup.enter="onSubmit">
                    <template v-slot:append>
                      <q-btn round dense flat :color="isDragging ? 'primary' : null" icon="mdi-camera-outline"
                        @click="$refs.fileInput.click()" />
                      <q-btn v-if="userInput || previewImage" round dense flat color="primary" icon="mdi-send"
                        size="sm" @click="onSubmit" />
                    </template>
                  </q-input>
                  <input type="file" ref="fileInput" style="display: none" @change="onFileChange" />
                </div>
              </div>
            </div>
          </ActionBar>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from "vue";
import { ActionBar } from ".";
import {
  chat,
  getChatHistory,
  createConversation,
  listConversations,
  getConversation,
  getConversationHistory
} from "../api/copilot";
import api from "../api";
import { buildAdd, getRelativeTimeLabel } from "../utilities";
import { marked } from "marked";
import { useStore } from "vuex";
import { useQuasar } from "quasar";
import { API_URL } from "../config";

export default {
  props: {
    dense: Boolean,
    dark: Boolean,
    value: Boolean,
    user: Object,
    resource: Object,
  },
  components: { ActionBar },
  emits: ["input"],
  setup(props, context) {
    const isOpen = computed({
      get: () => props.value,
      set: (next) => context.emit("input", next),
    });
    const isDragging = ref(false);
    const onDragEnter = (evt) => {
      if (
        Array.from(evt.dataTransfer.items).some((item) => item.kind === "file")
      ) {
        isDragging.value = true;
      }
    };
    const onDragLeave = () => {
      isDragging.value = false;
    };
    const onDrop = (evt) => {
      isDragging.value = false;
      const files = Array.from(evt.dataTransfer.files);
      if (!files.length) {
        return;
      }
      const file = files[0];
      onFileChange(file);
    };
    const Resource = useStore().$db().model("_resources");
    const Document = Resource.find("documents");
    const $q = useQuasar();
    const conversations = ref([]);
    const currentConversationId = ref(null);
    const currentConversation = ref(null);
    const messages = ref([]);
    const userInput = ref("");
    const pendingResponses = ref(0);
    const isLoading = computed(() => pendingResponses.value > 0);
    const isProcessing = computed(() => pendingResponses.value > 0);
    const fileInput = ref(null);
    const previewImage = ref(null);
    const scrollArea = ref(null);
    const inputRef = ref(null);
    const focusInput = () => {
      nextTick(() => {
        if (inputRef.value && typeof inputRef.value.focus === "function") {
          inputRef.value.focus();
        }
      });
    };
    const onDialogShow = () => {
      // Auto-focus the input once the dialog has finished animating. Skip on
      // mobile so we don't surprise the user with a virtual keyboard.
      if (!props.dense) focusInput();
    };
    const isGroupStart = (index) => {
      if (index === 0) return true;
      const prev = messages.value[index - 1];
      const curr = messages.value[index];
      if (!prev || !curr) return true;
      return prev.sent !== curr.sent;
    };
    const sidebarOpen = ref(false);
    const searchQuery = ref("");
    const botAvatar = computed(() =>
      props.dark ? "icons/copilot-eye-white.svg" : "icons/copilot-eye-black.svg"
    );
    const filteredConversations = computed(() => {
      if (!searchQuery.value) return conversations.value;
      return conversations.value.filter(c =>
        c.title.toLowerCase().includes(searchQuery.value.toLowerCase())
      );
    });
    const toolbarClasses = computed(() => ({
      sticky: !props.dense,
      fixed: props.dense,
      "text-black": props.dark,
      "text-white": !props.dark,
      "bg-grey-1": props.dark,
      "bg-grey-9": !props.dark,
    }));
    const sectionClasses = computed(() => ({
      "q-pt-none": !props.dense,
      "q-pt-xl": props.dense,
    }));
    const sectionStyle = computed(() => ({
      minHeight: props.dense ? "calc(100dvh - 50px)" : "calc(100% - 80px)",
      marginTop: props.dense ? "0px" : "0px",
      overflow: "hidden",
      height: props.dense ? "calc(100dvh - 50px)" : "calc(100% - 90px)",
    }));
    const bottomBarClasses = computed(() => ({
      "absolute-bottom full-width bottom-bar": true,
      sticky: !props.dense,
      fixed: props.dense,
    }));
    const sentColor = computed(() => {
      return props.dark ? "green-10" : "green-1";
    });
    const receivedColor = computed(() => {
      return props.dark ? "grey-9" : "grey-3";
    });
    // Touch/swipe gesture support
    const touchStartX = ref(0);
    const touchStartY = ref(0);
    const touchEndX = ref(0);
    const touchEndY = ref(0);
    const handleTouchStart = (event) => {
      touchStartX.value = event.touches[0].clientX;
      touchStartY.value = event.touches[0].clientY;
    };
    const handleTouchEnd = (event) => {
      touchEndX.value = event.changedTouches[0].clientX;
      touchEndY.value = event.changedTouches[0].clientY;
      handleSwipe();
    };
    const handleSwipe = () => {
      const diffX = touchStartX.value - touchEndX.value;
      const diffY = touchStartY.value - touchEndY.value;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          if (sidebarOpen.value) closeSidebar();
        } else {
          if (!sidebarOpen.value && touchStartX.value < 50) toggleSidebar();
        }
      }
    };
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
    };
    const closeSidebar = () => {
      sidebarOpen.value = false;
    };
    // Load conversations list
    const loadConversations = async () => {
      try {
        const response = await listConversations(props.user?.token);
        conversations.value = response.data.slice(0, 10);
      } catch (error) {
        console.error("Error loading conversations:", error);
        if (error.response?.data?.detail === "Invalid or expired token") {
          await api.logout();
        }
      }
    };
    // Load conversation history
    const loadConversationHistory = async (conversationId) => {
      try {
        const response = await getConversationHistory(conversationId, props.user?.token);
        const mappedMessages = response.data.map((chat) => ({
          name: chat.sender_id === props.user?.id ? props.user?.name : chat.sender_id,
          avatar: chat.sender_id === props.user?.id ? props.user?.photo : botAvatar.value,
          text: chat.sender_id === props.user?.id ? chat.message : parseMessage(chat.message),
          sender_id: chat.sender_id,
          document_id: chat.document_id,
          file: getFileUrl(chat),
          timestamp: chat.created_time || null,
          sent: chat.sender_id === props.user?.id,
        }));
        messages.value = mappedMessages.sort((a, b) => {
          const timeA = new Date(a.timestamp || 0);
          const timeB = new Date(b.timestamp || 0);
          return timeA - timeB;
        });
        scrollDown(0, 100);
      } catch (error) {
        console.error("Error loading conversation history:", error);
        messages.value = [];
      }
    };
    // Load conversation details
    const loadConversationDetails = async (conversationId) => {
      try {
        const response = await getConversation(conversationId, props.user?.token);
        currentConversation.value = response.data;
      } catch (error) {
        console.error("Error loading conversation details:", error);
      }
    };
    // Load a specific conversation
    const loadConversation = async (conversationId) => {
      currentConversationId.value = conversationId;
      await loadConversationDetails(conversationId);
      await loadConversationHistory(conversationId);
      closeSidebar();
    };
    // Start a new chat
    const startNewChat = () => {
      currentConversationId.value = null;
      currentConversation.value = null;
      messages.value = [];
      userInput.value = "";
      previewImage.value = null;
      closeSidebar();
    };
    const createNewConversation = async (userQuery) => {
      try {
        const response = await createConversation(
          {
            user_query: userQuery,
            current_url: window.location.href,
            tenant_api_url: API_URL
          },
          props.user?.token
        );
        const newConversation = response.data;
        conversations.value.unshift(newConversation);
        if (conversations.value.length > 10) {
          conversations.value = conversations.value.slice(0, 10);
        }
        currentConversationId.value = newConversation.id;
        currentConversation.value = newConversation;
        return newConversation;
      } catch (error) {
        console.error("Error creating conversation:", error);
        return null;
      }
    };
    const updateConversationTitle = (conversationId, title) => {
      const conversation = conversations.value.find(c => c.id === conversationId);
      if (conversation) {
        conversation.title = title;
      }
      if (currentConversation.value?.id === conversationId) {
        currentConversation.value.title = title;
      }
    };
    const getFileUrl = (chat) => {
      return chat.document_id ? Document?.getRecord(chat.document_id)?.file : null;
    };
    const clearImage = () => {
      previewImage.value = null;
      fileInput.value.value = "";
    };
    const scrollDown = (animation = 0, delay = 0) => {
      setTimeout(() => {
        if (scrollArea.value) {
          scrollArea.value.setScrollPercentage("vertical", 1.1, animation);
        }
      }, delay);
    };
    const onSubmit = async () => {
      if (!userInput.value.trim() && !previewImage.value) return;
      pendingResponses.value++;
      const user_query = userInput.value;
      userInput.value = "";
      const isNewChat = !currentConversationId.value;

      // Optimistically show the chat UI immediately for new conversations
      if (isNewChat) {
        const tempId = `temp-${Date.now()}`;
        currentConversationId.value = tempId;
        currentConversation.value = {
          id: tempId,
          title: user_query.split(' ').slice(0, 8).join(' '),
        };
      }

      const userMessage = {
        name: props.user?.name,
        avatar: props.user?.photo,
        text: user_query,
        file: previewImage?.value,
        timestamp: new Date().toLocaleTimeString(),
        sent: true,
      };
      messages.value.push(userMessage);
      scrollDown(300);

      let newDocument = null;
      if (previewImage.value) {
        const file = fileInput.value.files[0];
        previewImage.value = null;
        try {
          const then = (document) => {
            newDocument = document;
          };
          const add = buildAdd({
            dark: props.dark,
            resource: Document,
            data: { value: { file: file } },
            quasar: $q,
            then,
          });
          await add();
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      }

      // Create conversation in background for new chats (don't block the UI)
      let conversationId = isNewChat ? null : currentConversationId.value;
      let conversationPromise = null;
      if (isNewChat) {
        conversationPromise = createNewConversation(user_query)
          .then((newConversation) => {
            if (newConversation) {
              currentConversationId.value = newConversation.id;
              currentConversation.value = newConversation;
              const title = user_query.split(' ').slice(0, 8).join(' ');
              updateConversationTitle(newConversation.id, title);
              return newConversation.id;
            }
            return null;
          })
          .catch((error) => {
            console.error("Error creating conversation:", error);
            return null;
          });
      }

      // Wait for conversation ID before sending the chat message
      if (conversationPromise) {
        conversationId = await conversationPromise;
        if (!conversationId) {
          pendingResponses.value--;
          messages.value.push({
            name: "Copilot",
            avatar: botAvatar.value,
            text: "Sorry, I couldn't start a conversation. Please try again.",
            timestamp: new Date().toLocaleTimeString(),
            sent: false,
          });
          scrollDown(300);
          return;
        }
      }

      const data = {
        user_query: user_query,
        conversation_id: conversationId,
        current_url: window.location.href,
        tenant_api_url: API_URL
      };
      if (newDocument) {
        data.document_id = newDocument.id;
      }
      chat(data, props.user?.token)
        .then((message) => {
          if (message?.data?.response) {
            messages.value.push({
              name: "Copilot",
              avatar: botAvatar.value,
              text: parseMessage(message.data.response),
              timestamp: new Date().toLocaleTimeString(),
              sent: false,
            });
          }
          pendingResponses.value--;
          scrollDown(300);
        })
        .catch((error) => {
          console.log("Error sending message:", error);
          pendingResponses.value--;
          messages.value.push({
            name: "Copilot",
            avatar: botAvatar.value,
            text: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date().toLocaleTimeString(),
            sent: false,
          });
          scrollDown(300);
        });
    };
    const onFileChange = (event) => {
      const file = event.target ? event.target.files[0] : event;
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          previewImage.value = reader.result;
        };
        reader.readAsDataURL(file);
      }
    };
    const closeDialog = () => {
      isOpen.value = false;
    };
    const autoLinkUrls = (html) => {
      // Replace bare URLs (not already inside an <a> tag) with linked versions
      // Negative lookbehind ensures we don't match URLs already in href="..." or >url</a>
      html = html.replace(
        /(?<!=["'])(https?:\/\/[^\s<>"']+)/g,
        (match, url, offset, str) => {
          // Check if this URL is already inside an <a> tag
          const before = str.substring(0, offset);
          const openA = before.lastIndexOf('<a');
          const closeA = before.lastIndexOf('</a>');
          if (openA > closeA) return match; // inside an <a> tag, skip
          return `<a href="${url}" target="_blank">here</a>`;
        }
      );
      // For existing <a> tags where the label is just the URL, replace with "here"
      html = html.replace(
        /<a\s([^>]*href=["']([^"']+)["'][^>]*)>(https?:\/\/[^\s<]+)<\/a>/gi,
        (match, attrs, href, label) => {
          return `<a ${attrs}>here</a>`;
        }
      );
      return html;
    };
    const parseMessage = (message) => {
      if (!message || typeof message !== 'string') return message;

      // 1. Check if it's already HTML (contains real HTML tags)
      const htmlTagRegex = /<\/?(?:p|div|span|br|h[1-6]|ul|ol|li|table|tr|td|th|a|strong|em|b|i|code|pre|blockquote|img|hr)\b[^>]*\/?>/i;
      if (htmlTagRegex.test(message)) {
        return autoLinkUrls(message);
      }

      // 2. Check for markdown patterns
      const markdownPatterns = [
        /^#{1,6}\s/m,
        /\*\*[^*]+\*\*/,
        /```[\s\S]*?```/,
        /`[^`]+`/,
        /^\s*[-*+]\s/m,
        /^\s*\d+\.\s/m,
        /\[.+?\]\(.+?\)/,
        /^\s*>/m,
      ];
      if (markdownPatterns.some(p => p.test(message))) {
        return autoLinkUrls(marked.parse(message, { breaks: true }));
      }

      // 3. Plain text — convert newlines to <br>
      // Handle both literal "\n" (escaped) and actual newline characters
      const text = message.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
      return autoLinkUrls(text);
    };
    // Handle window resize
    const handleResize = () => {
      if (sidebarOpen.value) {
        closeSidebar();
      }
    };
    onMounted(async () => {
      await loadConversations();
      window.addEventListener('resize', handleResize);
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
    });
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    });
    return {
      isOpen,
      conversations,
      currentConversationId,
      currentConversation,
      messages,
      userInput,
      onSubmit,
      closeDialog,
      toolbarClasses,
      sectionClasses,
      sectionStyle,
      bottomBarClasses,
      botAvatar,
      isLoading,
      isProcessing,
      scrollArea,
      previewImage,
      onFileChange,
      fileInput,
      clearImage,
      sentColor,
      receivedColor,
      getRelativeTimeLabel,
      isDragging,
      onDragEnter,
      onDragLeave,
      onDrop,
      sidebarOpen,
      toggleSidebar,
      closeSidebar,
      handleTouchStart,
      handleTouchEnd,
      startNewChat,
      loadConversation,
      searchQuery,
      filteredConversations,
      inputRef,
      onDialogShow,
      isGroupStart
    };
  },
};
</script>
