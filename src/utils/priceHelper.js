/**
 * Price Helper - Get price based on user level
 * Level 1 = Basic, Level 2 = Pro, Level 3 = Plus
 */

/**
 * Get the appropriate price for a user based on their level
 * @param {Object} item - Package or Acc object with price fields
 * @param {number} userLevel - User's level (1, 2, or 3)
 * @returns {number} The price for the user
 */
function getPriceForLevel(item, userLevel = 1) {
    const level = parseInt(userLevel) || 1;

    switch (level) {
        case 1: // Basic
            return item.price_basic ?? item.price;
        case 2: // Pro
            return item.price_pro ?? item.price;
        case 3: // Plus
            return item.price_plus ?? item.price;
        default:
            return item.price;
    }
}

/**
 * Get level label from level number
 * @param {number} level 
 * @returns {string}
 */
function getLevelLabel(level) {
    const labels = {
        1: "Basic",
        2: "Pro",
        3: "Plus"
    };
    return labels[level] || "Basic";
}

/**
 * Get level info object
 * @param {number} level 
 * @returns {Object}
 */
function getLevelInfo(level) {
    const levels = {
        1: { value: 1, label: "Basic", color: "#6B7280", icon: "⭐" },
        2: { value: 2, label: "Pro", color: "#3B82F6", icon: "⭐⭐" },
        3: { value: 3, label: "Plus", color: "#8B5CF6", icon: "⭐⭐⭐" }
    };
    return levels[level] || levels[1];
}

module.exports = {
    getPriceForLevel,
    getLevelLabel,
    getLevelInfo
};
