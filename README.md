# 📸 Snap2Sheet — Image to Excel Converter

> Upload a photo of any table. Get a fully editable Excel spreadsheet in seconds — powered by Google Gemini AI.

![Snap2Sheet Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

---

## 📌 About

Snap2Sheet is an AI-powered web application that extracts tabular data from images — screenshots, photos, or scanned documents — and converts them into interactive, fully editable spreadsheets. Whether it's a printed report, a photo of a whiteboard, or a screenshot from another app, Snap2Sheet maps every row and column accurately so you can download it as `.xlsx`, copy it to Google Sheets, or edit it right in the browser.

---

## ✨ Features

### 🤖 AI-Powered Extraction
- Uses **Google Gemini** (`gemini-3-flash-preview`) for high-precision OCR and table structure recognition
- Handles complex layouts including multi-column tables, merged cells, and blank cells
- Returns a perfectly rectangular, normalized grid — no data loss

### 🗂️ Interactive Worksheet Editor
- Fully editable cells directly in the browser
- **Multi-cell selection** — click and drag to select ranges
- **Row & column selection** by clicking headers
- **Select All** with a single click

### 🎨 Cell Formatting
- **Bold**, *Italic*, text alignment (left / center / right)
- Custom **font family** (Inter, Arial, Verdana, Times New Roman, and more)
- Custom **font size** (8px – 32px)
- **Background color** and **text color** pickers
- **Text wrap** toggle
- **Row span** and **column span** (merged cells)

### 🔁 Conditional Formatting
- Define rules to auto-style cells based on their value
- Supported operators: greater than, less than, equals, contains, does not contain, starts with, ends with, is empty, is not empty
- Multiple rules supported — rules are merged and applied in order

### 🔍 Find & Replace
- Search across all cells with **Match Case** and **Whole Word** options
- Navigate through matches and replace individually or all at once

### 💾 Export Options
| Option | Description |
|--------|-------------|
| **Download .xlsx** | Export as a native Excel file |
| **Copy with Formatting** | Copies as rich HTML — paste directly into Excel or Google Sheets with styles preserved |
| **Text Only Copy** | Plain tab-separated text for quick pasting |
| **Share** | Share as a `.csv` file via the native device share sheet |

### 🔄 Autosave
- Data, styles, and conditional rules are automatically saved to `localStorage`
- Your work is restored on next visit — no manual saving needed

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS (CDN) |
| AI / OCR | Google Gemini API (`@google/genai`) |
| Excel Export | SheetJS (`xlsx`) |
| Animations | Motion (`motion/react`) |
| Icons | Lucide React |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- A **Gemini API key** — get one free at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/snap2sheet.git
cd snap2sheet

# 2. Install dependencies
npm install

# 3. Set up your environment
# Create a .env.local file in the root and add:
# GEMINI_API_KEY=your_api_key_here

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
snap2sheet/
├── components/
│   ├── Layout.tsx         # App shell — header, footer, modals
│   ├── Uploader.tsx       # Drag-and-drop image upload with preview
│   ├── Worksheet.tsx      # Interactive spreadsheet editor
│   └── Modal.tsx          # Reusable animated modal
├── services/
│   └── geminiService.ts   # Gemini API integration & table extraction
├── utils/
│   └── excelUtils.ts      # xlsx export, CSV, clipboard, share helpers
├── types.ts               # TypeScript interfaces (TableData, CellStyle, etc.)
├── App.tsx                # Root component & state management
├── index.tsx              # React entry point
├── index.html             # HTML shell with Tailwind CDN
├── vite.config.ts         # Vite config with env variable injection
└── tsconfig.json
```

---

## 🖼️ How It Works

1. **Upload** — Drag and drop or select a PNG, JPG, or WEBP image (max 5MB)
2. **AI Analysis** — Gemini scans the image, maps the spatial layout, and returns a structured JSON grid
3. **Review & Edit** — The extracted data loads into an interactive worksheet where you can edit, format, and apply conditional rules
4. **Export** — Download as `.xlsx`, copy with formatting, or share as CSV

---

## ⚙️ Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key (required) |

---

## 📦 Key Dependencies

```json
"dependencies": {
  "@google/genai": "^1.34.0",
  "lucide-react": "^1.8.0",
  "motion": "^12.38.0",
  "react": "^19.2.3",
  "react-dom": "^19.2.3",
  "xlsx": "^0.18.5"
}
```

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m "Add your feature"`
4. Push to your branch — `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is currently unlicensed. Contact the author for usage permissions.

---

> *Snap2Sheet — Because retyping tables is so last century.*
