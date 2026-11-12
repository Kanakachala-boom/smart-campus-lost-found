import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Users,
  Send,
  Lock,
  ArrowRight,
} from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import { LoadingState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import messagesService from "../../services/messagesService";
import "./MessagesHub.css";

export default function MessagesHub() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedUserIdParam = searchParams.get("user");

  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");

  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [_error, setError] = useState(null);
  const [sendError, setSendError] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch student conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await messagesService.getMyConversations();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setConversations(list);

      // Auto-select conversation if query param or first in list
      if (selectedUserIdParam) {
        const found = list.find((t) => String(t.other_user_id) === String(selectedUserIdParam));
        if (found) {
          setSelectedUser({
            user_id: found.other_user_id,
            name: found.other_user_name,
            role: found.other_user_role,
            claim_id: found.claim_id,
            claim: found.claim,
          });
        }
      } else if (list.length > 0 && !selectedUser) {
        setSelectedUser({
          user_id: list[0].other_user_id,
          name: list[0].other_user_name,
          role: list[0].other_user_role,
          claim_id: list[0].claim_id,
          claim: list[0].claim,
        });
      }
    } catch (err) {
      setError(err.message || "Failed to load conversations.");
    } finally {
      setIsLoadingThreads(false);
    }
  }, [selectedUserIdParam, selectedUser]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // 2. Fetch messages for the selected user
  const loadMessages = useCallback(async (silent = false) => {
    if (!selectedUser?.user_id) return;
    if (!silent) setIsLoadingMessages(true);

    try {
      const res = await messagesService.getUserConversation(selectedUser.user_id);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setMessages(list);
    } catch (err) {
      if (!silent) {
        setError(err.message || "Failed to load messages.");
      }
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  }, [selectedUser?.user_id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => loadMessages(true), 3500);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !selectedUser?.user_id) return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);
    setSendError(null);

    try {
      const res = await messagesService.sendMessage({
        receiver_id: selectedUser.user_id,
        text: textToSend,
        claim_id: selectedUser.claim_id,
      });
      const newMsg = res?.data || res;
      setMessages((prev) => [...prev, newMsg]);
      loadConversations();
    } catch (err) {
      setInputText(textToSend);
      setSendError(err.message || "Failed to dispatch message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="messages-hub-page">
        {/* Header */}
        <div className="messages-hub-header">
          <h1 className="messages-hub-title">Student Messages</h1>
          <p className="messages-hub-subtitle">
            Secure private coordination between students regarding lost and found belongings.
          </p>
        </div>

        {/* Main Communications Box */}
        <div className="messages-hub-container">
          {/* Left Column: Conversations List */}
          <div className="messages-sidebar">
            <div className="messages-sidebar-header">
              <span>Direct Conversations</span>
              <MessageSquare size={16} color="var(--color-primary)" />
            </div>

            <div className="messages-thread-list">
              {isLoadingThreads ? (
                <div style={{ padding: "var(--space-4)" }}>
                  <LoadingState message="Loading threads…" />
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: "var(--space-6) var(--space-4)", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--text-xs)" }}>
                  No student conversations yet. Coordinate directly from any lost or found claim!
                </div>
              ) : (
                conversations.map((thread) => {
                  const isSelected = selectedUser?.user_id === thread.other_user_id;
                  return (
                    <div
                      key={thread.other_user_id}
                      className={`messages-thread-item ${isSelected ? "messages-thread-item--active" : ""}`}
                      onClick={() => {
                        setSelectedUser({
                          user_id: thread.other_user_id,
                          name: thread.other_user_name,
                          role: thread.other_user_role,
                          claim_id: thread.claim_id,
                          claim: thread.claim,
                        });
                        setSearchParams({ user: thread.other_user_id });
                      }}
                    >
                      <div className="messages-thread-top">
                        <span className="messages-thread-name">{thread.other_user_name}</span>
                        <span className="messages-thread-role">
                          {thread.other_user_role}
                        </span>
                      </div>
                      <div className="messages-thread-preview">
                        {thread.last_message || "No message preview"}
                      </div>
                      <div className="messages-thread-meta">
                        <span className="messages-thread-time">
                          {thread.last_message_at ? new Date(thread.last_message_at).toLocaleDateString() : ""}
                        </span>
                        {thread.unread_count > 0 && (
                          <span className="messages-thread-badge">{thread.unread_count}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Stream */}
          <div className="messages-chat-pane">
            {selectedUser ? (
              <>
                {/* Chat Top Banner with Participants and Roles */}
                <div className="messages-chat-header">
                  <div className="messages-chat-participants">
                    <div className="messages-chat-names">
                      <span>{user?.name} ({user?.role})</span>
                      <ArrowRight size={14} color="var(--color-primary)" />
                      <span>{selectedUser.name} ({selectedUser.role})</span>
                    </div>
                    <div className="messages-chat-details">
                      <span>Private Student Communication</span>
                      {selectedUser.claim && (
                        <span className="messages-chat-claim-pill">
                          Claim #{selectedUser.claim_id}: {selectedUser.claim.item_name || "Reported Item"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="messages-chat-badge">
                    <Lock size={12} /> End-to-End Logged
                  </div>
                </div>

                {/* Messages Body */}
                <div className="messages-body">
                  {isLoadingMessages ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                      <LoadingState message="Loading chat history…" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="messages-chat-empty">
                      <p>Start your private discussion with {selectedUser.name}.</p>
                      <span>Agree on safe meeting spots (e.g. Campus Library or Security Desk).</span>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.user_id;
                      return (
                        <div
                          key={msg.message_id}
                          className={`message-bubble-wrapper ${isMe ? "message-bubble-wrapper--out" : "message-bubble-wrapper--in"}`}
                        >
                          <div className="message-meta-header">
                            <span className="message-sender-tag">
                              {isMe ? "You" : msg.sender_name}
                            </span>
                            <span className="message-role-tag">
                              ({msg.sender_role || "STUDENT"})
                            </span>
                            <span className="message-recipient-tag">
                              to {isMe ? msg.receiver_name : "You"}
                            </span>
                          </div>

                          <div className={`message-bubble ${isMe ? "message-bubble--out" : "message-bubble--in"}`}>
                            <p className="message-text">{msg.text || msg.message}</p>
                            <span className="message-timestamp">
                              {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form className="messages-input-bar" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="messages-input-field"
                    placeholder={`Message ${selectedUser.name}…`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isSending}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!inputText.trim() || isSending}
                    isLoading={isSending}
                  >
                    <Send size={15} /> Send
                  </Button>
                </form>
                {sendError && (
                  <div style={{ padding: "6px 16px", color: "var(--color-danger)", fontSize: "var(--text-xs)" }}>
                    {sendError}
                  </div>
                )}
              </>
            ) : (
              <div className="messages-no-selection">
                <Users size={40} color="var(--color-text-muted)" />
                <h3>No Conversation Selected</h3>
                <p>Select a thread from the left or initiate a claim to message a student directly.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
