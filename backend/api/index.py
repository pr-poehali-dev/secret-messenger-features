import json
import os
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_pwd(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}


def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}


def handler(event: dict, context) -> dict:
    """Основное API мессенджера: регистрация, вход, пользователи, группы, сообщения"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    qs = event.get("queryStringParameters") or {}

    # POST /register
    if method == "POST" and path.endswith("/register"):
        username = body.get("username", "").strip().lower()
        display_name = body.get("display_name", "").strip()
        password = body.get("password", "")
        if not username or not display_name or not password:
            return err("Заполните все поля")
        if len(username) < 3:
            return err("Никнейм минимум 3 символа")
        if len(password) < 4:
            return err("Пароль минимум 4 символа")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                if cur.fetchone():
                    return err("Никнейм уже занят")
                cur.execute(
                    "INSERT INTO users (username, display_name, password_hash) VALUES (%s, %s, %s) RETURNING id, username, display_name, is_admin",
                    (username, display_name, hash_pwd(password))
                )
                user = dict(cur.fetchone())
        return ok({"user": user})

    # POST /login
    if method == "POST" and path.endswith("/login"):
        username = body.get("username", "").strip().lower()
        password = body.get("password", "")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, username, display_name, is_admin FROM users WHERE username = %s AND password_hash = %s",
                    (username, hash_pwd(password))
                )
                user = cur.fetchone()
                if not user:
                    return err("Неверный логин или пароль")
                cur.execute("UPDATE users SET last_seen = NOW() WHERE id = %s", (user["id"],))
        return ok({"user": dict(user)})

    # GET /users?q=@ник
    if method == "GET" and path.endswith("/users"):
        q = qs.get("q", "").strip().lstrip("@").lower()
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, username, display_name, last_seen FROM users WHERE username ILIKE %s LIMIT 20",
                    (f"%{q}%",)
                )
                users = [dict(r) for r in cur.fetchall()]
        return ok({"users": users})

    # GET /groups?user_id=X
    if method == "GET" and path.endswith("/groups"):
        user_id = qs.get("user_id")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if user_id:
                    cur.execute("""
                        SELECT g.id, g.name, g.description, g.created_at,
                               COUNT(DISTINCT gm2.user_id) as member_count
                        FROM groups_chat g
                        JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = %s
                        LEFT JOIN group_members gm2 ON g.id = gm2.group_id
                        GROUP BY g.id, g.name, g.description, g.created_at
                        ORDER BY g.created_at DESC
                    """, (user_id,))
                else:
                    cur.execute("""
                        SELECT g.id, g.name, g.description, g.created_at,
                               COUNT(gm.user_id) as member_count
                        FROM groups_chat g
                        LEFT JOIN group_members gm ON g.id = gm.group_id
                        GROUP BY g.id, g.name, g.description, g.created_at
                        ORDER BY g.created_at DESC
                    """)
                groups = [dict(r) for r in cur.fetchall()]
        return ok({"groups": groups})

    # POST /groups
    if method == "POST" and path.endswith("/groups"):
        name = body.get("name", "").strip()
        description = body.get("description", "").strip()
        user_id = body.get("user_id")
        if not name or not user_id:
            return err("Нужно название и ID пользователя")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "INSERT INTO groups_chat (name, description, created_by) VALUES (%s, %s, %s) RETURNING id, name, description",
                    (name, description, user_id)
                )
                group = dict(cur.fetchone())
                cur.execute(
                    "INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)",
                    (group["id"], user_id)
                )
        return ok({"group": group})

    # POST /groups/join
    if method == "POST" and path.endswith("/groups/join"):
        group_id = body.get("group_id")
        user_id = body.get("user_id")
        if not group_id or not user_id:
            return err("Нужны group_id и user_id")
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO group_members (group_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (group_id, user_id)
                )
        return ok({"ok": True})

    # GET /groups/members?group_id=X
    if method == "GET" and path.endswith("/groups/members"):
        group_id = qs.get("group_id")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT u.id, u.username, u.display_name, u.last_seen
                    FROM users u
                    JOIN group_members gm ON u.id = gm.user_id
                    WHERE gm.group_id = %s
                """, (group_id,))
                members = [dict(r) for r in cur.fetchall()]
        return ok({"members": members})

    # GET /messages?group_id=X
    if method == "GET" and path.endswith("/messages"):
        group_id = qs.get("group_id")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT m.id, m.text, m.created_at, u.username, u.display_name
                    FROM messages m
                    JOIN users u ON m.user_id = u.id
                    WHERE m.group_id = %s
                    ORDER BY m.created_at ASC
                    LIMIT 200
                """, (group_id,))
                msgs = [dict(r) for r in cur.fetchall()]
        return ok({"messages": msgs})

    # POST /messages
    if method == "POST" and path.endswith("/messages"):
        group_id = body.get("group_id")
        user_id = body.get("user_id")
        text = body.get("text", "").strip()
        if not group_id or not user_id or not text:
            return err("Нужны group_id, user_id и text")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "INSERT INTO messages (group_id, user_id, text) VALUES (%s, %s, %s) RETURNING id, text, created_at",
                    (group_id, user_id, text)
                )
                msg = dict(cur.fetchone())
        return ok({"message": msg})

    # GET /admin/chats (all groups + messages for admin)
    if method == "GET" and path.endswith("/admin/chats"):
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT m.id, m.text, m.created_at, u.username, u.display_name,
                           g.name as group_name, g.id as group_id
                    FROM messages m
                    JOIN users u ON m.user_id = u.id
                    JOIN groups_chat g ON m.group_id = g.id
                    ORDER BY m.created_at DESC
                    LIMIT 100
                """)
                msgs = [dict(r) for r in cur.fetchall()]
                cur.execute("SELECT id, username, display_name, is_admin, last_seen FROM users ORDER BY created_at DESC")
                users = [dict(r) for r in cur.fetchall()]
        return ok({"messages": msgs, "users": users})

    return err("Not found", 404)
