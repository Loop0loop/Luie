#import <AppKit/AppKit.h>
#import <dispatch/dispatch.h>
#include <node_api.h>

namespace {

napi_value GetUndefined(napi_env env) {
  napi_value value;
  napi_get_undefined(env, &value);
  return value;
}

napi_value Alignment(napi_env env, napi_callback_info info) {
  #if TARGET_OS_OSX
    @autoreleasepool {
      auto performAlignment = ^{
        id<NSHapticFeedbackPerformer> performer = [NSHapticFeedbackManager defaultPerformer];
        if (performer != nil) {
          [performer performFeedbackPattern:NSHapticFeedbackPatternAlignment
                            performanceTime:NSHapticFeedbackPerformanceTimeNow];
        }
      };

      if ([NSThread isMainThread]) {
        performAlignment();
      } else {
        dispatch_sync(dispatch_get_main_queue(), performAlignment);
      }
    }
  #endif

  return GetUndefined(env);
}

}  // namespace

NAPI_MODULE_INIT() {
  napi_value alignmentFn;
  napi_create_function(env, "alignment", NAPI_AUTO_LENGTH, Alignment, nullptr, &alignmentFn);
  napi_set_named_property(env, exports, "alignment", alignmentFn);
  return exports;
}
