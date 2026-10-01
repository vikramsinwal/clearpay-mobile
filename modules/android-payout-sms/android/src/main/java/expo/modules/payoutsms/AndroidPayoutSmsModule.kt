package expo.modules.payoutsms

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * SMS detection is not part of this app. The module stays so existing JS
 * calls resolve, and every call reports that SMS access is unavailable.
 */
class AndroidPayoutSmsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidPayoutSmsModule")
    Events("onPayoutPaymentCandidate")

    AsyncFunction("getCapability") {
      mapOf(
        "platform" to "android",
        "status" to "POLICY_RESTRICTED",
      )
    }

    AsyncFunction("getStatus") {
      "POLICY_RESTRICTED"
    }

    AsyncFunction("requestPermissionIfSupported") {
      "POLICY_RESTRICTED"
    }

    AsyncFunction("startPaymentDetection") {
      "POLICY_RESTRICTED"
    }

    AsyncFunction("stopPaymentDetection") {
      Unit
    }
  }
}
