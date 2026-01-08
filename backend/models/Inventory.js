const mongoose = require('mongoose');
const { Schema } = mongoose;

const ItemSchema = new Schema({
  itemId: String,
  name: String,
  type: String, // e.g., "weapon", "armor", "consumable"
  quantity: { type: Number, default: 1 },
  equipped: { type: Boolean, default: false }
}, { _id: false });

const InventorySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [ItemSchema], // Main inventory
  equippedItems: [ItemSchema] // Equipped slots
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);
