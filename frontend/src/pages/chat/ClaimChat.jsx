import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Lock, Send, ShieldCheck } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import { LoadingState, ErrorState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import claimsService from "../../services/claimsService";
import messagesService from "../../services/messagesService";
import "./ClaimChat.css";

export function ClaimChat() {
  const { claimId } = useParams();
  const { user } = useAuth();

  const [claim, setClaim] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const claimRes = await claimsService.getClaimById(claimId);
        const msgsRes = await messagesService.getClaimMessages(claimId);

        if (!cancelled) {
          setClaim(claimRes?.data || claimRes);
          setMessages(Array.isArray(msgsRes?.data) ? msgsRes.data : Array.isArray(msgsRes) ? msgsRes : []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load claim chat conversation.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [claimId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await messagesService.sendClaimMessage(claimId, messageText, user);
      const newMsg = res?.data || res;
      setMessages((prev) => [...prev, newMsg]);
    } catch {
      // Restore input on failure
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="claim-chat-page">
        <div className="claim-chat-topbar">
          <Link to={`/claims/${claimId}`} className="claim-detail-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Claim Details</span>
          </Link>
        </div>

        {isLoading ? (
          <LoadingState message="Connecting to secure claim chat…" />
        ) : error || !claim ? (
          <ErrorState
            title="Chat Unavailable"
            message={error || "Conversation could not be loaded."}
            onRetry={() => window.location.reload()}
          />
        ) : (
          <div className="claim-chat-card">
            {/* Header */}
            <div className="claim-chat-header">
              <div>
                <h1 className="claim-chat-header__title">
                  {claim.item?.item_name || "Claim Verification"}
                </h1>
                <span className="claim-chat-header__sub">
                  Claim #{claim.claim_id} • Status: {claim.status} • Custody: {claim.item?.custody_location || "Campus Security"}
                </span>
              </div>
              <ShieldCheck size={24} color="var(--color-primary)" />
            </div>

            {/* Privacy Reassurance */}
            <div className="claim-chat-notice">
              <Lock size={12} />
              <span>
                Protected In-App Channel: Direct phone numbers and personal emails are hidden.
              </span>
            </div>

            {/* Messages */}
            <div className="claim-chat-messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--color-text-muted)", margin: "auto", fontSize: "var(--text-sm)" }}>
                  No messages yet. Send a message to coordinate with campus evaluators.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.user_id;
                  return (
                    <div
                      key={msg.message_id}
                      className={`chat-bubble ${isMine ? "chat-bubble--mine" : "chat-bubble--other"}`}
                    >
                      <span className="chat-bubble__sender">{msg.sender_name}</span>
                      <span className="chat-bubble__text">{msg.text}</span>
                      <span className="chat-bubble__time">
                        {msg.created_at?.split(" ")[1]?.substring(0, 5) || "Just now"}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form className="claim-chat-input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="claim-chat-input"
                placeholder="Type your message…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending}
                maxLength={500}
                aria-label="Message text"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Send}
                isLoading={isSending}
                disabled={!inputText.trim()}
              >
                Send
              </Button>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ClaimChat;
