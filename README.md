# ClientFlow 📊

A full-stack web application for managing clients, tracking invoices, and monitoring payment status through a secure authenticated dashboard.

### 🚀 [View Live Demo](https://clientflow-qh.netlify.app/)

---

### 💼 About This Project

ClientFlow provides a centralized workspace for contractors and small businesses to manage client information and invoice records. Users can create an account, add companies and their associated contact emails, create invoices for specific projects, and track whether invoices have been paid.

The dashboard includes:

* **🔐 User Authentication:** Users can create accounts and securely sign in using JWT-based authentication, with passwords protected using bcrypt hashing.

* **🏢 Client Directory:** Add and manage company records alongside their associated contact email addresses.

* **🧾 Invoice Management:** Create invoices with a project description, GBP (£) amount, and assigned client.

* **💷 Payment Tracking:** Mark invoices as paid or unpaid and automatically calculate total collected revenue and outstanding balances.

* **📊 Dashboard Overview:** View key financial metrics including total collected, outstanding balance, and the number of active clients.

* **🛡️ Role-Based Access:** Separate user and administrator roles provide different access levels, including an administration panel for managing registered accounts.

---

### 🛠️ Tech Stack

* **Frontend:** React 19, JavaScript (ES6+), Vite

* **Styling:** CSS3 with custom properties and responsive layouts

* **Backend:** Node.js, Express.js

* **Database:** PostgreSQL with Neon

* **Authentication:** JSON Web Tokens (JWT) and bcrypt

* **API:** RESTful API endpoints for authentication, clients, invoices, and administration

---

### 🏗️ Architecture

ClientFlow is structured as a separate frontend and backend application:

* `client/` — React/Vite frontend responsible for the user interface and dashboard.

* `server/` — Node.js/Express backend responsible for authentication, API routes, database operations, and authorization.

* **PostgreSQL** stores user accounts, client records, and invoice data, with relationships connecting users to their clients and invoices.

---

ClientFlow is an ongoing project and is being actively developed with additional functionality and improvements being introduced over time.