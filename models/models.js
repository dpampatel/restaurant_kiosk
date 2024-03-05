import mongoose from "mongoose";
const uri =
  "mongodb+srv://dpampatel:conestoga@cluster0.rhp25qd.mongodb.net/Committers_RCOS?retryWrites=true&w=majority";
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("------------------ Connected to Mongodb ------------------");
  })
  .catch((error) => {
    console.log("Not connected to Mongo Db" + error);
  });

// Customer schema
const customerSchema = new mongoose.Schema({
  FirstName: { type: String, required: true },
  LastName: { type: String, required: true },
  PhoneNumber: { type: String, required: true },
  EmailAddress: { type: String, required: true },
});

const Customer = mongoose.model("Customer", customerSchema);

// CustomerPreferences schema
const customerPreferencesSchema = new mongoose.Schema({
  Customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  PreferredLanguage: String,
  DateOfBirth: Date,
  MembershipStatus: String,
});

const CustomerPreferences = mongoose.model(
  "CustomerPreferences",
  customerPreferencesSchema
);

// MenuCategory schema
const menuCategorySchema = new mongoose.Schema({
  CategoryName: { type: String, required: true },
  Description: String,
});

const MenuCategory = mongoose.model("MenuCategory", menuCategorySchema);

// MenuItem schema
const menuItemSchema = new mongoose.Schema({
  Category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuCategory",
    required: true,
  },
  ItemName: { type: String, required: true },
  Description: String,
  Price: { type: Number, required: true },
});

const MenuItem = mongoose.model("MenuItem", menuItemSchema);

// ItemAvailability schema
const itemAvailabilitySchema = new mongoose.Schema({
  Item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  Availability: { type: String, required: true, default: true },
  AvailableQuantity: { type: Number, required: true },
  LastRestockedDate: Date,
});

const ItemAvailability = mongoose.model(
  "ItemAvailability",
  itemAvailabilitySchema
);

// OrderTable schema
const orderTableSchema = new mongoose.Schema({
  Customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  OrderDateTime: Date,
  OrderStatus: String,
});

const OrderTable = mongoose.model("OrderTable", orderTableSchema);

// OrderedItems schema
const orderedItemsSchema = new mongoose.Schema({
  Order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OrderTable",
    required: true,
  },
  Item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  Quantity: { type: Number, required: true },
  ItemPrice: { type: Number, required: true },
  Subtotal: Number,
  TaxAmount: Number,
  OrderTotal: Number,
});

const OrderedItems = mongoose.model("OrderedItems", orderedItemsSchema);

// Receipt schema
const receiptSchema = new mongoose.Schema({
  Order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OrderTable",
    required: true,
  },
  TotalAmount: { type: Number, required: true },
  PaymentMethod: String,
});

const Receipt = mongoose.model("Receipt", receiptSchema);

// Export models
export {
  Customer,
  CustomerPreferences,
  MenuCategory,
  MenuItem,
  ItemAvailability,
  OrderTable,
  OrderedItems,
  Receipt,
};
