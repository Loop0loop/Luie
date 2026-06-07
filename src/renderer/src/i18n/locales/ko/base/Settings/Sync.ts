export const koBaseSettingsSync = {
      title: "동기화 및 연결",
      description:
        "Google 계정을 연결하고 Supabase와 프로젝트 데이터를 동기화합니다.",
      connected: "연결됨",
      disconnected: "연결 안 됨",
      fields: {
        connection: "연결 상태",
        email: "연결 계정",
        lastSyncedAt: "마지막 동기화",
        mode: "진행 상태",
        autoSync: "자동 동기화",
      },
      status: {
        idle: "대기",
        connecting: "연결 중",
        syncing: "동기화 중",
        error: "오류",
      },
      actions: {
        connectGoogle: "Google 연결",
        reconnectGoogle: "다시 로그인",
        disconnect: "연결 해제",
        syncNow: "지금 동기화",
      },
      conflicts: "충돌: 총 {{total}}건 (원고 {{chapters}} / 스크랩 {{memos}})",
      toast: {
        connectStarted: "브라우저에서 Google 로그인을 완료해 주세요.",
        connected: "Google 계정 연결이 완료되었습니다.",
        connectFailed: "Google 연결에 실패했습니다.",
        staleCallback:
          "이미 처리된 로그인 콜백입니다. 현재 연결 상태를 유지합니다.",
        stateMismatch:
          "로그인 보안 검증(state)이 일치하지 않았습니다. 다시 로그인해 주세요.",
        callbackExpired: "로그인 요청이 만료되었습니다. 다시 로그인해 주세요.",
        disconnectFailed: "연결 해제에 실패했습니다.",
        disconnected: "연결이 해제되었습니다.",
        syncFailed: "동기화에 실패했습니다.",
        synced: "동기화가 완료되었습니다.",
        autoSyncFailed: "자동 동기화 설정 변경에 실패했습니다.",
      },
    };
