# online-chess-tcp
online chess server over TCP sockets 
# Online Chess over TCP

An online chess server & client implemented over raw TCP sockets.  
Modular design separates networking, game logic, and UI layers, and uses a simple, language-agnostic JSON protocol so different teams’ implementations can interoperate.

---

## 🚀 Overview

- **Server**  
  - Accepts up to 4 concurrent clients  
  - Manages matchmaking, coin-toss, game sessions, move validation, timers  
- **Client**  
  - Connects to server, logs in, discovers & challenges opponents  
  - Sends/receives moves, renders board & elapsed time (console or GUI)  

---

## 📋 Functional Requirements

1. **TCP socket communication**  
2. **Login & presence**  
   - Clients send `LOGIN {"username": "Alice"}`  
   - Server maintains a “waiting” pool  
3. **Discovery & challenge**  
   - `LIST_WAITING` → list of waiting users  
   - `CHALLENGE {"target": "Bob"}` → server forwards challenge  
   - `ACCEPT` / `REJECT` responses  
4. **Coin-toss & color assignment**  
   - Server picks white/black and notifies both clients  
5. **Move exchange**  
   - `MOVE {"from": [r,c], "to": [r,c]}`  
   - Server enforces turn order & relays move  
6. **Board & timer updates**  
   - After each move, server sends full board state + timers  
7. **Multi-client support** (future)  
   - Queue up to 4 clients → match multiple pairs concurrently  
8. **Interoperability**  
   - JSON-based messages, well-documented protocol  
9. **(Optional) GUI**  
   - Swap console renderer for a graphical board  

---

## ⚙️ Non-Functional Requirements

- **Concurrency & scalability**: thread-safe or async server  
- **Protocol simplicity**: small, versioned JSON objects  
- **Extensibility**: clean separation of concerns  
- **Reliability**: handle disconnects, timeouts gracefully  
- **Performance**: sub-second turn latency over LAN  

---

## 🎯 Success Criteria

- Two clients on separate machines can:
  1. **Login** → enter waiting pool  
  2. **Discover & challenge** → handshake  
  3. **Coin-toss** → assign sides  
  4. **Play** → legal moves, board & timers update  
- Server holds at least 4 connections  
- Another team’s client/server can interoperate  

---

