---
description: How to test the Classification Analysis feature
---

1. Ensure the development server is running:
   ```bash
   npm run dev
   ```

2. Open the application in your browser (usually http://localhost:3000).

3. Navigate to the "Classification Analysis" section. This might be a tab or a link on the main dashboard.

4. Verify the following:
   - **Data Loading**: The charts and tables should load without errors.
   - **Tabs**: You should be able to switch between "IPC Classifications" and "CPC Classifications".
   - **Charts**:
     - **Top Classifications**: A bar chart showing the top 15 classifications.
     - **Classifications by Owner**: A grouped bar chart showing classifications for top owners.
     - **Classifications over Time**: A line/area chart showing trends over years.
     - **Owner vs Classification Heatmap**: A heatmap showing the density of classifications per owner.
   - **Interactivity**: Hover over chart elements to see tooltips with specific data points.

5. If any data is missing or charts are empty, check the browser console and the server terminal for error messages. Ensure the CSV files in `data/raw/` are present and correctly named.
