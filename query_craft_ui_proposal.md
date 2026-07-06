To put the spotlight firmly on the **Active Conversation** and the **Conversation List**, we need to move the API cards and UI Schema into a secondary, collapsible layer. They should only appear when explicitly summoned by the user, keeping the daily workspace clean and focused.

Here is a proposed UX layout redesign that prioritizes your core communication tools while keeping the technical details just a click away.

---

## The Redesigned Layout Strategy

Instead of forcing all components to share screen real estate simultaneously, we switch to a **Split-Pane Workspace with an Expandable Context Panel**.

### 1. Visual Hierarchy Breakdown

* **Left Column (25% width):** The **Conversation List**. This remains fixed or easily accessible for quick switching between chats.
* **Center Column (Primary Focus - 50% to 75% width):** The **Active Conversation**. This takes up the lion's share of the screen to give breathing room for reading and typing.
* **Right Column (0% to 25% width):** The **Technical Context Panel** (UI Schema & API Cards). By default, this is hidden or minimized.

---

## UX Wireframe & Interaction Flow

### Default View: Focused Communication

When a user opens the app, the interface is lean. The API and Schema clutter is completely gone, giving the active chat maximum real estate.

```
+-----------------------------------------------------------------------+
|  App Header                                            [{} View Tech] |
+------------+----------------------------------------------------------+
|            |                                                          |
|            |  Active Conversation                                     |
| Chat List  |                                                          |
|            |  User: "Hello, how do I..."                              |
| - Chat 1   |  AI: "You can manage that by..."                         |
| - Chat 2   |                                                          |
| - Chat 3   |                                                          |
|            |  +----------------------------------------------------+  |
|            |  | Type a message...                       [Send]     |  |
|            |  +----------------------------------------------------+  |
+------------+----------------------------------------------------------+

```

### Expanded View: Technical Deep-Dive

When the user needs to inspect the UI Schema or API cards, they click the **"View Tech"** toggle button in the top right header (or an inline icon next to a specific message). The right panel smoothly slides out.

```
+-----------------------------------------------------------------------+
|  App Header                                            [*Close Tech*] |
+------------+------------------------------------+---------------------+
|            |                                    | Technical Panel     |
|            |  Active Conversation               +---------------------+
| Chat List  |                                    | [UI Schema]  [API]  |
|            |  User: "Hello, how do I..."        |                     |
| - Chat 1   |  AI: "You can manage that by..."   | {                   |
| - Chat 2   |                                    |   "type": "object", |
| - Chat 3   |                                    |   "properties": ... |
|            |  +------------------------------+  | }                   |
|            |  | Type a message...     [Send] |  |                     |
|            |  +------------------------------+  |                     |
+------------+------------------------------------+---------------------+

```

---

## 3 Ways to Trigger the API & UI Schema

Depending on *why* these cards need to be visible, here are three elegant UX patterns to show them conditionally:

1. **The Global Toggle Switch (Header):**
* **How it works:** A button in the main header (e.g., `</> Inspect` or `View Schema`) toggles a right-side drawer.
* **Best for:** Developers or power users who want to keep the schema open for an entire session while testing.


2. **Inline Message Inspector (Hover/Action):**
* **How it works:** Each message in the Active Conversation has a subtle "Code" or "Details" icon that appears on hover. Clicking it opens the schema/API data *specifically for that piece of data*.
* **Best for:** Checking the API payload of a single, specific response without cluttering the whole screen.


3. **Split Tabs in a Collapsible Drawer:**
* **How it works:** Inside the right panel, use a simple tab system: **Tab 1: UI Schema**, **Tab 2: API Cards**.
* **Best for:** Saving horizontal space so the technical data doesn't feel overwhelming when opened.



## Key Benefits of this UX

* **Reduces Cognitive Load:** Everyday users or standard workflows only see a clean chat interface.
* **Maintains Context:** Because it opens as a side panel rather than a modal pop-up, users can look at the Active Conversation and the UI Schema side-by-side.
* **Responsive:** On smaller screens, the side panel can overlay the chat completely, while on ultrawide monitors, it can stay pinned without hurting the chat experience.

---

Would you prefer this technical panel to slide out from the right side as a drawer, or would an accordion-style dropdown directly inside the chat bubbles work better for your workflow?

=================================
I am working on a project called QueryCrafter, and I'm having an issue with the workflow sequence when creating a new conversation. 

### The Core Issue:
The app is not properly handling the sequence required for a brand-new chat session. When a user clicks "New Chat", the system fails to correctly execute the initialization pipeline. 

### The Required 3-Step Workflow:
Every time a new chat is initialized, it must strictly follow this lifecycle:
1. **Step 1 (Create Chat):** Create a brand-new chat instance/conversation ID in the state.
2. **Step 2 (Attach DDL Schema):** Open or trigger the schema input/selection specifically *for this new chat conversation*.
3. **Step 3 (Configure API):** Bind the API configuration context to this specific new chat session.

Currently, it is breaking or skipping steps, making it difficult to link the schema and API configuration to the newly created chat.


### Your Task:
1. Analyze why the workflow is breaking after creating a chat and why it isn't seamlessly moving to the DDL schema and API config assignment steps for that specific chat ID.
2. Refactor the code or state logic to ensure that creating a new chat automatically initializes the state container for its schema and API config, guiding the user or the state pipeline through Steps 1, 2, and 3 seamlessly.
3. Provide the exact code changes needed.

======================