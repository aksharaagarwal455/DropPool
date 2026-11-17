// Illustrative values only. These are NOT official Blinkit, Zepto or Instamart tariffs.
// Admins edit them from real checkout screenshots. Thresholds of null mean "never".
const DEFAULT_PROFILES = {
  blinkit: {
    platform: 'blinkit',
    deliveryFeePaise: 2500,
    freeDeliveryAbovePaise: 19900,
    handlingFeePaise: 500,
    smallCartFeePaise: 2000,
    smallCartBelowPaise: 10000,
    otherFeePaise: 0,
  },
  zepto: {
    platform: 'zepto',
    deliveryFeePaise: 2500,
    freeDeliveryAbovePaise: 19900,
    handlingFeePaise: 500,
    smallCartFeePaise: 2000,
    smallCartBelowPaise: 10000,
    otherFeePaise: 0,
  },
  instamart: {
    platform: 'instamart',
    deliveryFeePaise: 3000,
    freeDeliveryAbovePaise: 19900,
    handlingFeePaise: 500,
    smallCartFeePaise: 2000,
    smallCartBelowPaise: 14900,
    otherFeePaise: 0,
  },
}

const PLATFORMS = Object.keys(DEFAULT_PROFILES)

module.exports = { DEFAULT_PROFILES, PLATFORMS }
