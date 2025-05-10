import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";

export default function InitialLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      setIsAppReady(true);
    };

    initSession();
  }, []);

  useEffect(() => {
    if (!isAppReady) return;

    const isAuthScreen = segments[0] === "(auth)";

    if (!session && !isAuthScreen) {
      router.replace("/(auth)/login");
    } else if (session && isAuthScreen) {
      router.replace("/(tabs)");
    }
  }, [session, segments, isAppReady]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
