/**
 * SupportChatRoom Durable Object
 * 
 * Manages real-time SSE connections and message broadcasting for a specific 
 * conversation thread. This ensures durability and horizontal scalability.
 */
export class SupportChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);

    // 1. SSE Connection Handler
    if (url.pathname === "/stream") {
      const stream = new ReadableStream({
        start: (controller) => {
          this.sessions.add(controller);
          
          // Send initial connection event
          const initial = `data: ${JSON.stringify({ 
            type: 'connected', 
            timestamp: new Date().toISOString(),
            room: this.state.id.toString() 
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(initial));
        },
        cancel: (controller) => {
          this.sessions.delete(controller);
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 2. Message Broadcast Handler
    if (request.method === "POST" && url.pathname === "/message") {
      try {
        const payload = await request.json();
        this.broadcast(payload);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response("Invalid payload", { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }

  /**
   * Broadcasts a payload to all currently connected SSE clients in this room.
   */
  broadcast(payload) {
    const data = new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
    
    // Create a copy to iterate safely
    const activeSessions = Array.from(this.sessions);
    
    for (const session of activeSessions) {
      try {
        session.enqueue(data);
      } catch (e) {
        // Stream closed or errored, remove it
        this.sessions.delete(session);
      }
    }
  }
}
