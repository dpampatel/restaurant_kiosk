console.log("DB Final Project");

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import flash from "express-flash";
import {
  Customer,
  CustomerPreferences,
  MenuCategory,
  MenuItem,
  ItemAvailability,
  OrderTable,
  OrderedItems,
  Receipt,
} from "./models/models.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true })); // body parser to convert data

// Set up session and flash
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

app.listen(4000, () => {
  console.log("Listening to port 4000!!");
});

app.get("/customer", (req, res) => {
  res.render("landingpage");
});

app.get("/menu", async (req, res) => {
  try {
    // Fetch all categories from the Category collection
    const categories = await MenuCategory.find();

    // Fetch all menu items from the MenuItem collection
    const menuItems = await MenuItem.find();

    res.render("menu", { categories, menuItems });
  } catch (error) {
    console.error(error);
    req.flash("error", "An error occurred while fetching menu data.");
    res.redirect("/");
  }
});

app.get("/place_order", async (req, res) => {
  try {
    const customers = await Customer.find();
    const menuItems = await MenuItem.find().populate("Category");

    for (const menuItem of menuItems) {
      const availability = await ItemAvailability.findOne({
        Item: menuItem._id,
      });
      if (availability) {
        menuItem.availableQuantity = availability.AvailableQuantity;
      } else {
        menuItem.availableQuantity = 0; // No availability found, set to 0
      }
    }

    res.render("place_order", { customers, menuItems });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred.");
  }
});

app.post("/customer", async (req, res) => {
  try {
    const {
      FirstName,
      LastName,
      PhoneNumber,
      EmailAddress,
      PreferredLanguage,
      DateOfBirth,
      MembershipStatus,
    } = req.body;

    const existingCustomer = await Customer.findOne({
      FirstName,
      LastName,
    });

    if (existingCustomer) {
      req.flash(
        "error",
        "Customer with this first name and last name already exists."
      );
      return res.redirect("/customer");
    }

    // Create a new customer
    const newCustomer = await Customer.create({
      FirstName,
      LastName,
      PhoneNumber,
      EmailAddress,
    });

    // Create preferences for the customer
    const newPreferences = await CustomerPreferences.create({
      Customer: newCustomer._id,
      PreferredLanguage,
      DateOfBirth,
      MembershipStatus,
    });

    req.flash("success", "Customer and preferences added successfully!");
    return res.redirect("/customer");
  } catch (error) {
    console.error(error);
    req.flash(
      "error",
      "An error occurred while creating customer and preferences."
    );
    res.status(500).json({
      error: "An error occurred while creating customer and preferences.",
    });
  }
});

// POST route to add a category
app.post("/addcategory", async (req, res) => {
  try {
    const { CategoryName, Description } = req.body;

    // Check if the category already exists
    const existingCategory = await MenuCategory.findOne({ CategoryName });
    if (existingCategory) {
      req.flash("error", "Category already exists.");
      return res.redirect("/menu"); // Redirect to the menu page
    }

    // Create a new MenuCategory
    const newCategory = await MenuCategory.create({
      CategoryName,
      Description,
    });

    req.flash("success", "Category added successfully!");
    res.redirect("/menu"); // Redirect to the menu page
  } catch (error) {
    console.error(error);
    req.flash("error", "An error occurred while adding the category.");
    res.redirect("/menu"); // Redirect to the menu page
  }
});

// POST route to add a menu item
app.post("/addmenuitem", async (req, res) => {
  try {
    const { Category, ItemName, Description, Price, AvailableQuantity } =
      req.body;

    // Check if the specified category exists
    const existingCategory = await MenuCategory.findById(Category);
    if (!existingCategory) {
      req.flash("menuerror", "Invalid category selected.");
      return res.redirect("/menu"); // Redirect to the menu page
    }

    // Check if the menu item with the same name already exists
    const existingMenuItem = await MenuItem.findOne({ ItemName });
    if (existingMenuItem) {
      req.flash("menuerror", "A menu item with the same name already exists.");
      return res.redirect("/menu"); // Redirect to the menu page
    }

    // Create a new MenuItem
    const newMenuItem = await MenuItem.create({
      Category: existingCategory._id,
      ItemName,
      Description,
      Price,
    });

    // Create a new ItemAvailability
    const newItemAvailability = await ItemAvailability.create({
      Item: newMenuItem._id,
      AvailableQuantity,
    });

    req.flash("menusuccess", "Menu item added successfully!");
    res.redirect("/menu"); // Redirect to the menu page
  } catch (error) {
    console.error(error);
    req.flash("menuerror", "An error occurred while adding the menu item.");
    res.redirect("/menu"); // Redirect to the menu page
  }
});

app.post("/removeitem", async (req, res) => {
  try {
    const { ItemId } = req.body;
    console.log(req.body);
    // Find the item to be removed
    const removedMenuItem = await MenuItem.findByIdAndRemove(ItemId);

    if (!removedMenuItem) {
      req.flash("removeerror", "Item not found.");
      return res.redirect("/menu");
    }

    // Remove item's availability information
    await ItemAvailability.findOneAndRemove({ Item: ItemId });

    // Success message
    req.flash("removesuccess", "Item removed successfully.");
    res.redirect("/menu");
  } catch (error) {
    console.error(error);
    req.flash("removeerror", "An error occurred while removing the item.");
    res.redirect("/menu");
  }
});

app.get("/getMenuItemsForCustomer", async (req, res) => {
  const customerId = req.query.customerId;

  try {
    const customerPreferences = await CustomerPreferences.findOne({
      Customer: customerId,
    });
    if (!customerPreferences) {
      res.status(404).json({ error: "Customer preferences not found" });
      return;
    }

    const preferredLanguage = customerPreferences.PreferredLanguage;
    const menuItems = await MenuItem.find()
      .populate("Category")
      .where("Category.CategoryName")
      .equals(preferredLanguage);

    res.status(200).json({ menuItems });
  } catch (error) {
    console.error("Error fetching menu items for customer:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/getAvailability", async (req, res) => {
  const menuItemIds = req.query.menuItemIds; // An array of menu item IDs

  try {
    const availabilities = await ItemAvailability.find({
      Item: { $in: menuItemIds },
    });

    const availabilityMap = {};
    availabilities.forEach((availability) => {
      availabilityMap[availability.Item.toString()] =
        availability.AvailableQuantity;
    });

    res.status(200).json(availabilityMap);
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/place_order", async (req, res) => {
  try {
    let { customer, menuItems } = req.body; // Extract form data
    const restructuredMenuItems = [];
    for (let i = 0; i < menuItems.length; i += 2) {
      const itemId = menuItems[i];
      const quantity = parseInt(menuItems[i + 1]);
      restructuredMenuItems.push({ itemId, quantity });
    }
    menuItems = restructuredMenuItems;
    console.log(customer, menuItems);

    const newOrder = await OrderTable.create({
      Customer: customer,
      OrderDateTime: new Date(),
      OrderStatus: "Pending",
    });

    for (const menuItem of menuItems) {
      const { itemId, quantity } = menuItem;
      console.log();
      const selectedItem = await MenuItem.findById(itemId);
      const itemAvailability = await ItemAvailability.findOne({ Item: itemId });

      if (selectedItem && itemAvailability) {
        const itemPrice = selectedItem.Price;
        const subtotal = itemPrice * quantity;

        // Create an entry in OrderedItems collection
        await OrderedItems.create({
          Order: newOrder._id,
          Item: itemId,
          Quantity: quantity,
          ItemPrice: itemPrice,
          Subtotal: subtotal,
          TaxAmount: (0.13 * subtotal).toFixed(2) * 1, // Calculate tax amount
          OrderTotal: subtotal, // Total includes taxes and other charges
        });

        // Update available quantity in ItemAvailability collection
        itemAvailability.AvailableQuantity -= quantity;
        await itemAvailability.save();
      }
    }

    // Calculate the total amount for the entire order
    const orderItems = await OrderedItems.find({ Order: newOrder._id });
    const totalAmount = orderItems.reduce(
      (total, item) => total + item.Subtotal + item.TaxAmount,
      0
    );

    // Create a receipt entry in Receipt collection
    const receipt = await Receipt.create({
      Order: newOrder._id,
      TotalAmount: totalAmount,
      PaymentMethod: "Cash", // Set payment method if available
    });
    customer = await Customer.findById(customer);
    for (const orderedItem of orderItems) {
      const item = await MenuItem.findById(orderedItem.Item);
      if (item) {
        orderedItem.ItemName = item.ItemName;
      }
    }
    res.render("receipt", { receipt, orderItems, customer }); // Redirect to a success page
  } catch (error) {
    console.error(error);
    req.flash("placeOrderError", "An error occurred while placing the order.");
    res.redirect("/place_order"); // Redirect back to the order page
  }
});

// GET request to fetch orders and render the order_list.ejs template
app.get("/order_list", async (req, res) => {
  try {
    const orders = await OrderTable.find();

    const ordersWithItems = [];
    for (const order of orders) {
      const orderItems = await OrderedItems.find({ Order: order._id }).populate(
        "Item"
      );
      ordersWithItems.push({ ...order.toObject(), orderItems });
    }

    res.render("order_list", { orders: ordersWithItems });
  } catch (error) {
    console.error(error);
    req.flash("orderListError", "An error occurred while fetching orders.");
    res.redirect("/order_list");
  }
});

app.post("/update_order_status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    console.log(orderId, status);
    const updatedOrder = await OrderTable.findByIdAndUpdate(
      orderId,
      { OrderStatus: status },
      { new: true }
    );
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the order status." });
  }
});

//PDF generation
import PDFDocument from "pdfkit";

app.post("/pdf", async (req, res) => {
  try {
    const doc = new PDFDocument({ size: "A4", margin: 30 });

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=menu.pdf");
    doc.pipe(res);

    // Fetch menu items from the MenuItem collection
    const menuItems = await MenuItem.find().populate("Category"); // Populate the 'Category' field

    // Create a map to group items by category
    const groupedItems = new Map();

    menuItems.forEach((item) => {
      if (!groupedItems.has(item.Category.CategoryName)) {
        groupedItems.set(item.Category.CategoryName, []);
      }
      groupedItems.get(item.Category.CategoryName).push(item);
    });

    // Add logo and company name
    const logoPath = path.join(__dirname, "public", "images", "logo.png");
    const companyName = "Committers";
    const menuTitle = "Menu";

    // Load the logo image
    doc.image(logoPath, doc.page.width - 180, 20, {
      width: 120,
      align: "right",
    });

    // Display the company name
    doc.fontSize(25).text(companyName, doc.page.width - 560, 80, {
      width: 200,
      align: "Left",
    });

    doc.fontSize(20).text(menuTitle, { align: "center" });

    const footerHeight = 25; // Height of the footer

    // Iterate through grouped items and add them to the PDF
    groupedItems.forEach((items, category) => {
      let currentY = doc.y + 20; // Add some spacing from previous content

      // Add margin and red background color to category name
      const margin = 5;
      const categoryNameHeight = 10;
      const categoryRectHeight = categoryNameHeight + 2 * margin;
      doc.rect(0, currentY, doc.page.width, categoryRectHeight).fill("red");
      doc
        .fontSize(14)
        .fillColor("white")
        .text(`Category: ${category}`, margin, currentY + margin, {
          align: "center",
        });
      doc.fillColor("black"); // Reset fill color
      currentY += categoryRectHeight;

      items.forEach((item) => {
        const itemHeight = 3 * 10 + 3 * 12 + 2 * 14 + 2 * 10;

        if (currentY + itemHeight + footerHeight > doc.page.height) {
          doc.addPage(); // Move to the next page
          currentY = 50; // Reset the Y position
        }

        // Add content for the menu item with margins
        const textMargin = 80;
        const textWidth = doc.page.width - 2 * textMargin;

        doc.moveDown(0.5); // Add top margin for the item
        doc.fontSize(12).text(`Item: ${item.ItemName}`, textMargin, doc.y, {
          align: "left",
          width: textWidth,
        });
        doc.moveDown(0.5); // Add some vertical spacing

        doc
          .fontSize(10)
          .text(`Description: ${item.Description}`, textMargin, doc.y, {
            align: "left",
            width: textWidth,
          });
        doc.moveDown(0.5); // Add some vertical spacing

        doc
          .fontSize(10)
          .text(`Price: $${item.Price.toFixed(2)}`, textMargin, doc.y, {
            align: "left",
            width: textWidth,
          });

        doc
          .lineWidth(0.5)
          .moveTo(textMargin, doc.y + 10)
          .lineTo(textMargin + textWidth, doc.y + 10)
          .stroke();
        doc.moveDown(1); // Add more spacing after the item
        currentY += itemHeight;
      });
    });

    // Add the footer at the bottom of the page
    const copyrightText = "© 2023 Committers. All rights reserved.";
    doc.fontSize(8).text(copyrightText, 0, doc.page.height - footerHeight, {
      align: "center",
      width: doc.page.width,
    });

    doc.end();
  } catch (error) {
    console.error(error);
    req.flash("pdferror", "An error occurred while generating the PDF.");
    res.redirect("/menu");
  }
});

app.post("/generate-pdf", (req, res) => {
  // Sample receipt data (replace with your actual data)
  const receiptData = {
    companyDetails: {
      companyName: "Committers",
      street: "108 University Ave, ON N2J 2W2",
      city: "Waterloo",
      province: "Ontario",
      email: "committers@Committers.com",
      phone: "+1234567890",
    },
    paymentDate: new Date().toLocaleDateString(),
    receiptId: "A00001",
    customerDetails: {
      customerId: "",
      customerName: "Emily Johnson",
      phoneNumber: "5551234567",
      emailAddress: "emily.johnson@yahoo.com",
    },
    orderItems: [
      {
        orderId: "ORDER001",
        description: "Product A",
        quantity: 2,
        subtotal: 100,
        tax: 10,
        amount: 110,
      },
      {
        orderId: "ORDER002",
        description: "Product B",
        quantity: 1,
        subtotal: 30,
        tax: 3,
        amount: 33,
      },
      // ... add more order items ...
    ],
    paymentMethod: "Credit Card",
    totalAmount: 143.0,
  };

  // Create a new PDF document
  const doc = new PDFDocument({ size: "A4", margin: 30 });

  // Set response headers for PDF download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=receipt.pdf");

  // Pipe the PDF output to the response
  doc.pipe(res);

  // Add logo on the right side
  const logoPath = path.join(__dirname, "public", "images", "logo.png");
  doc.image(logoPath, doc.page.width - 150, 10, { width: 120 });

  doc.fontSize(25).text(receiptData.companyDetails.companyName, {
    width: doc.page.width,
    align: "left",
  });
  doc.fontSize(12).text(receiptData.companyDetails.street, {
    width: doc.page.width - 100,
    align: "left",
  });
  doc.text(
    `${receiptData.companyDetails.city}, ${receiptData.companyDetails.province}`,
    {
      width: doc.page.width - 100,
      align: "left",
    }
  );
  doc.text(receiptData.companyDetails.email, {
    width: doc.page.width - 100,
    align: "left",
  });
  doc.text(receiptData.companyDetails.phone, {
    width: doc.page.width - 100,
    align: "left",
  });

  // Draw payment date and receipt ID on the right side
  const paymentDateX = doc.page.width - 200;
  const receiptIdX = doc.page.width - 200;
  doc.text(`Payment Date: ${receiptData.paymentDate}`, paymentDateX, 160);
  doc.text(`Receipt ID: ${receiptData.receiptId}`, receiptIdX, 180);

  // Add customer details
  doc.text(`Paid By: ${receiptData.customerDetails.customerId}`, 50, 160);
  doc.text(
    `Customer Name: ${receiptData.customerDetails.customerName}`,
    50,
    180
  );
  doc.text(`Phone No.: ${receiptData.customerDetails.phoneNumber}`, 50, 200);
  doc.text(`Email: ${receiptData.customerDetails.emailAddress}`, 50, 220);
  // Draw table header with colors and borders
  doc.lineWidth(1);
  doc.rect(50, 320, 510, 20).fillAndStroke("#80bfff", "#000");
  doc.fontSize(10).fillColor("#000").text("Order ID", 50, 322);
  doc.text("Description", 150, 322);
  doc.text("Quantity", 250, 322); // Adjusted position for Quantity header
  doc.text("Sub Total", 320, 322, { width: 80, align: "center" });
  doc.text("Tax", 400, 322, { width: 60, align: "center" });
  doc.text("Amount", 470, 322, { width: 80, align: "center" });

  // Draw each row of the table with colors and borders
  // Draw each row of the table with colors and borders
  let y = 340; // Starting Y position for the table
  receiptData.orderItems.forEach((item) => {
    doc.rect(50, y, 510, 20).stroke();
    doc
      .fontSize(10)
      .fillColor("#000")
      .text(item.orderId, 50, y + 2);
    doc.text(item.description, 150, y + 2);
    doc.text(item.quantity.toString(), 250, y + 2); // Adjusted position for Quantity
    doc.text(`$${item.subtotal.toFixed(2)}`, 320, y + 2, {
      width: 80,
      align: "center",
    });
    doc.text(`$${item.tax.toFixed(2)}`, 400, y + 2, {
      width: 60,
      align: "center",
    });
    doc.text(`$${item.amount.toFixed(2)}`, 470, y + 2, {
      width: 80,
      align: "center",
    });
    y += 20;
  });

  // Draw payment method with colors
  doc
    .fontSize(12)
    .text(`Payment Method: ${receiptData.paymentMethod}`, 50, y + 20);

  // Draw total amount under the Amount column
  doc.text(`Total:`, 470, y + 20, { width: 80 });
  doc.text(`$${receiptData.totalAmount.toFixed(2)}`, 500, y + 20, {
    width: 80,
  });

  // Finalize the PDF and end the response stream
  doc.end();
});
