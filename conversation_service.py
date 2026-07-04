import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from models import ChatMessage, Conversation, UserSession


def utcnow():
    return datetime.now(timezone.utc)


def _generate_title(schema: str, domain: str, fallback: str = "New chat") -> str:
    return (fallback or "New chat").strip()[:80]


def ensure_session(db, session_id: str | None = None) -> UserSession:
    if session_id:
        session = db.get(UserSession, session_id)
        if session:
            return session

    session = UserSession(id=session_id or str(uuid.uuid4()))
    db.add(session)
    db.flush()
    return session


def get_session_or_404(db, session_id: str) -> UserSession | None:
    return db.get(UserSession, session_id)


def conversation_summary(conversation: Conversation):
    message_count = None
    if "messages" in conversation.__dict__:
        message_count = len(conversation.messages or [])
    return {
        "id": conversation.id,
        "session_id": conversation.session_id,
        "title": conversation.title,
        "schema": conversation.schema,
        "domain": conversation.domain,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
        "last_message_time": conversation.last_message_time.isoformat() if conversation.last_message_time else None,
        "message_count": message_count,
    }


def message_dto(message: ChatMessage):
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "role": message.role,
        "content": message.content,
        "sql_query": message.sql_query,
        "reasoning": message.reasoning,
        "attempts_used": message.attempts_used,
        "created_at": message.created_at.isoformat(),
        "updated_at": message.updated_at.isoformat(),
    }


def session_dto(session: UserSession, active_conversation: Conversation | None = None):
    conversations = [conversation_summary(item) for item in session.conversations]
    return {
        "id": session.id,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "last_active_conversation_id": session.last_active_conversation_id,
        "active_conversation": conversation_summary(active_conversation) if active_conversation else None,
        "conversations": conversations,
    }


def list_conversations(db, session_id: str, query: str | None = None, limit: int = 50, offset: int = 0):
    statement = (
        select(Conversation)
        .where(Conversation.session_id == session_id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )

    if query:
        like = f"%{query.lower()}%"
        statement = statement.where(
            func.lower(Conversation.title).like(like)
            | func.lower(Conversation.domain).like(like)
            | func.lower(Conversation.schema).like(like)
        )

    return db.execute(statement).scalars().all()


def get_conversation(db, session_id: str, conversation_id: str) -> Conversation | None:
    statement = (
        select(Conversation)
        .where(Conversation.session_id == session_id, Conversation.id == conversation_id)
        .options(selectinload(Conversation.messages))
    )
    return db.execute(statement).scalars().first()


def create_conversation(
    db,
    session_id: str,
    title: str | None = None,
    schema: str = "",
    domain: str = "General",
    clone_from: Conversation | None = None,
):
    session = ensure_session(db, session_id)
    base_schema = clone_from.schema if clone_from else schema
    base_domain = clone_from.domain if clone_from else domain
    conversation = Conversation(
        id=str(uuid.uuid4()),
        session_id=session.id,
        title=(title or "").strip() or _generate_title(base_schema, base_domain),
        schema=base_schema or "",
        domain=(base_domain or "General").strip() or "General",
    )
    db.add(conversation)
    db.flush()
    session.last_active_conversation_id = conversation.id
    session.updated_at = utcnow()
    return conversation


def update_conversation(db, session_id: str, conversation_id: str, **changes):
    conversation = get_conversation(db, session_id, conversation_id)
    if not conversation:
        return None

    if "title" in changes and changes["title"] is not None:
        conversation.title = changes["title"].strip() or conversation.title
    if "schema" in changes and changes["schema"] is not None:
        conversation.schema = changes["schema"]
    if "domain" in changes and changes["domain"] is not None:
        conversation.domain = changes["domain"].strip() or conversation.domain
    if "last_message_time" in changes and changes["last_message_time"] is not None:
        conversation.last_message_time = changes["last_message_time"]

    conversation.updated_at = utcnow()
    return conversation


def delete_conversation(db, session_id: str, conversation_id: str):
    session = db.get(UserSession, session_id)
    conversation = get_conversation(db, session_id, conversation_id)
    if not session or not conversation:
        return False

    db.delete(conversation)
    db.flush()
    if session.last_active_conversation_id == conversation_id:
        remaining = list_conversations(db, session_id, limit=1)
        session.last_active_conversation_id = remaining[0].id if remaining else None
    session.updated_at = utcnow()
    return True


def set_active_conversation(db, session_id: str, conversation_id: str):
    session = ensure_session(db, session_id)
    conversation = get_conversation(db, session_id, conversation_id)
    if not conversation:
        return None
    session.last_active_conversation_id = conversation.id
    session.updated_at = utcnow()
    return conversation


def list_messages(db, session_id: str, conversation_id: str, limit: int = 100, offset: int = 0):
    conversation = get_conversation(db, session_id, conversation_id)
    if not conversation:
        return None, []
    statement = (
        select(ChatMessage)
        .join(Conversation)
        .where(ChatMessage.conversation_id == conversation.id, Conversation.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = db.execute(statement).scalars().all()
    return conversation, messages


def add_message(
    db,
    session_id: str,
    conversation_id: str,
    role: str,
    content: str = "",
    sql_query: str | None = None,
    reasoning: str | None = None,
    attempts_used: int | None = None,
):
    conversation = get_conversation(db, session_id, conversation_id)
    if not conversation:
        return None

    message = ChatMessage(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        role=role,
        content=content,
        sql_query=sql_query,
        reasoning=reasoning,
        attempts_used=attempts_used,
    )
    conversation.last_message_time = utcnow()
    conversation.updated_at = utcnow()
    db.add(message)
    db.flush()
    return message


def update_message(db, session_id: str, message_id: str, **changes):
    statement = select(ChatMessage).where(ChatMessage.id == message_id)
    if session_id:
        statement = statement.join(Conversation).where(Conversation.session_id == session_id)
    message = db.execute(statement).scalars().first()
    if not message:
        return None

    if "content" in changes and changes["content"] is not None:
        message.content = changes["content"]
    if "sql_query" in changes:
        message.sql_query = changes["sql_query"]
    if "reasoning" in changes:
        message.reasoning = changes["reasoning"]
    if "attempts_used" in changes:
        message.attempts_used = changes["attempts_used"]
    message.updated_at = utcnow()
    return message


def delete_message(db, session_id: str, message_id: str):
    statement = select(ChatMessage).where(ChatMessage.id == message_id)
    if session_id:
        statement = statement.join(Conversation).where(Conversation.session_id == session_id)
    message = db.execute(statement).scalars().first()
    if not message:
        return False
    db.delete(message)
    return True


def conversation_history(db, session_id: str, conversation_id: str):
    conversation = get_conversation(db, session_id, conversation_id)
    if not conversation:
        return None, []

    turns = []
    pending_user = None
    for message in conversation.messages:
        if message.role == "user":
            pending_user = message
            continue
        if message.role == "assistant" and pending_user:
            turns.append(
                {
                    "user": pending_user.content,
                    "assistant": {
                        "sql_query": message.sql_query or "",
                        "reasoning": message.reasoning or "",
                    },
                }
            )
            pending_user = None
    return conversation, turns


def clear_conversation_messages(db, session_id: str, conversation_id: str):
    conversation = get_conversation(db, session_id, conversation_id)
    if not conversation:
        return None
    db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation.id).delete()
    conversation.last_message_time = None
    conversation.updated_at = utcnow()
    return conversation
