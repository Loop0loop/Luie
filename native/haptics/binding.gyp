{
  "targets": [
    {
      "target_name": "luie_haptics",
      "sources": ["src/haptic.mm"],
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "OTHER_LDFLAGS": ["-framework", "AppKit"]
      }
    }
  ]
}
