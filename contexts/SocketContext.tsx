"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  isUserOnline: (userIdOrEmail?: string) => boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  isUserOnline: () => false,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const sessionUser = session?.user as any;
  const currentUserId = sessionUser?.id || sessionUser?.dbId;
  const currentUserEmail = sessionUser?.email;

  useEffect(() => {
    // Determine user identifiers from NextAuth session or localStorage
    const user = session?.user as any;
    let userId = user?.id || user?.dbId;
    let userEmail = user?.email;
    let token = user?.accessToken || user?.token;

    if (typeof window !== "undefined") {
      if (!token) token = localStorage.getItem("ats_access_token") || undefined;
      try {
        const rawUser = localStorage.getItem("ats_current_user");
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (!userId) userId = parsed.id || parsed.userId || parsed.dbId;
          if (!userEmail) userEmail = parsed.email;
        }
      } catch (e) {}
      if (!userId) userId = localStorage.getItem("ats_user_id") || undefined;
      if (!userEmail) userEmail = localStorage.getItem("ats_user_email") || undefined;
    }

    // Resolve base WebSocket URL (strip /api from NEXT_PUBLIC_API_URL)
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const serverUrl = rawApiUrl.replace(/\/api\/?$/, "");

    console.log(`[SocketContext] Initializing WebSocket client connection to ${serverUrl}...`);

    const newSocket = io(serverUrl, {
      auth: {
        userId,
        email: userEmail,
        token,
      },
      query: {
        userId,
        email: userEmail,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log(`[SocketContext] Connected to WebSocket gateway (id: ${newSocket.id})`);
      setIsConnected(true);
      newSocket.emit("get_online_users");
    });

    newSocket.on("online_users_list", (users: string[]) => {
      if (Array.isArray(users)) {
        setOnlineUsers(users.map((u) => String(u).toLowerCase()));
      }
    });

    newSocket.on("disconnect", (reason) => {
      console.log(`[SocketContext] Disconnected from WebSocket gateway: ${reason}`);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.warn(`[SocketContext] WebSocket connection warning:`, error.message);
      setIsConnected(false);
    });

    return () => {
      console.log("[SocketContext] Cleaning up WebSocket connection...");
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [session]);

  const isUserOnline = (userIdOrEmail?: string): boolean => {
    if (!userIdOrEmail) return false;
    const target = String(userIdOrEmail).toLowerCase().trim();
    
    // If it's the currently logged in user in this browser session, they are online
    if (currentUserId && String(currentUserId).toLowerCase() === target) return true;
    if (currentUserEmail && String(currentUserEmail).toLowerCase() === target) return true;

    return onlineUsers.includes(target);
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, isUserOnline }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
