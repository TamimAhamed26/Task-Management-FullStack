# Task Management System - Backend

A comprehensive enterprise-level task management backend API built with NestJS and PostgreSQL. This system provides advanced features for project management, team collaboration, real-time communication, analytics, and integrated payment processing.

##  Features

### 🔐 Authentication & Authorization
- **JWT Authentication** with automatic token refresh
- **Google OAuth Integration** for social login
- **Email Verification** system with resend capability
- **Password Reset** functionality with secure token validation
- **Remember Me** functionality with extended sessions
- **Role-based Access Control** (Manager, Collaborator, Admin)
- **Session Management** with automatic logout on inactivity

### 📋 Task Management
- **Complete CRUD Operations** for tasks
- **Task Status Management** (Todo, In Progress, Completed, Pending Approval, Rejected)
- **Priority Levels** (High, Medium, Low) with sorting
- **Task Assignment** to collaborators
- **Deadline Management** with overdue tracking
- **Task Search & Filtering** with advanced queries
- **Task Comments** with threaded/nested replies
- **File Attachments** for tasks
- **Task History** - complete audit trail
- **Time Logging** - track time spent on tasks
- **Task Notifications** with read/unread status

### 👥 Project & Team Management
- **Project Creation** and management
- **Team Management** within projects
- **Dynamic Team Assignment** to projects
- **Member Management** - add/remove team members
- **Project-based Task Filtering**
- **Team Performance Overview**

### 💬 Real-time Chat System
- **Direct Messaging** between users
- **Group Conversations** for team collaboration
- **Message History** with pagination
- **Read Receipts** and message status
- **WebSocket Integration** for real-time updates
- **Available Users** listing

### 📊 Advanced Analytics & Reporting
- **Weekly/Monthly Reports** with PDF generation
- **Custom Reports** with flexible date ranges
- **Task Completion Rate** analytics
- **Average Completion Time** metrics
- **Workload Distribution** analysis
- **Total Hours Tracking** per user/task
- **Task Priority Summary** breakdowns
- **Overdue Tasks Reports**
- **Manager Dashboard** with comprehensive metrics

### 💳 Payment Integration
- **Stripe Integration** for bonus payments
- **Payment Processing** for task completion bonuses
- **Payment Status Tracking**
- **Secure Payment Method Updates**
- **Payment Confirmation Handling**

### 📁 File Management
- **File Upload System** with validation
- **Report Generation** and download
- **PDF Report Creation** for analytics
- **Secure File Access** with role-based permissions

### 📧 Email Services
- **Email Deliverability Verification**
- **Verification Emails** for account activation
- **Password Reset Emails**
- **File Upload Notifications**
- **Uses Abstract API** for email validation
- Switches between **real Gmail SMTP** and **Nodemailer** test accounts

## 🛠️ Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Passport.js (JWT + Google OAuth)
- **Real-time**: WebSocket/Socket.io
- **Payments**: Stripe API
- **File Upload**: Multer + local storage
- **Email**: Nodemailer
- **PDF Generation**: PDF libraries for reports
- **Validation**: Class Validator & Class Transformer
- **Security**: bcrypt, JWT, CORS


##  Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (v13 or higher)
- **Stripe Account** (for payments)
- **Google OAuth App** (for social login)
- **Gmail Account** (for email services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TamimAhamed26/Task-Management-FullStack.git
   cd Task-Management-FullStack/Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the Backend directory:
   ```env
   # Database Configuration
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=your_postgres_username
   DATABASE_PASSWORD=your_postgres_password
   DATABASE_NAME=taskmanagement
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=30m
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
   
   # Email Configuration
   EMAIL_USER=your_gmail_account@gmail.com
   EMAIL_PASS=your_gmail_app_password
   ABSTRACT_API_KEY=your_abstract_api_key_for_email_validation
   
   # Stripe Configuration
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   
   # Frontend URL (for CORS)
   CLIENT_URL=http://localhost:3000
   ```

4. **Access the API**
   - API Base URL: http://localhost:3000

## 📚 API Endpoints

### Authentication Endpoints
```http
POST   /auth/signup                    # User registration
POST   /auth/login                     # User login
GET    /auth/verify/:token             # Email verification
POST   /auth/resend-verification       # Resend verification email
POST   /auth/forgot-password           # Request password reset
POST   /auth/reset-password            # Reset password
GET    /auth/status                    # Check token status
POST   /auth/logout                    # User logout
GET    /auth/google                    # Google OAuth login
GET    /auth/google/callback           # Google OAuth callback
GET    /auth/me                        # Get current user
```

### Task Management Endpoints
```http
GET    /tasks/pending                  # Get pending tasks
GET    /tasks/pending-approval         # Get tasks pending approval
GET    /tasks/sorted-by-priority       # Get tasks sorted by priority
GET    /tasks/search                   # Search tasks with filters
GET    /tasks/recent                   # Get recent tasks
GET    /tasks/nearing-deadline         # Get tasks nearing deadline
GET    /tasks/reports/overdue          # Get overdue tasks report
GET    /tasks/overview                 # Manager overview dashboard
GET    /tasks/manager/team-overview    # Team overview for managers
GET    /tasks/summary/by-priority      # Task priority summary

POST   /tasks                          # Create new task
GET    /tasks/task/:id                 # Get specific task
PATCH  /tasks/:id/assign               # Assign collaborator to task
PATCH  /tasks/:id/set-deadline-priority # Set deadline and priority
PATCH  /tasks/:id/status               # Update task status
PATCH  /tasks/:id/mark-completed       # Mark task as completed
PATCH  /tasks/:id/reject               # Reject task
DELETE /tasks/:id/delete               # Delete task permanently

# Task Comments
POST   /tasks/:id/comments             # Add comment to task
GET    /tasks/:id/comments             # Get task comments

# Task Attachments
POST   /tasks/:id/attachments          # Upload task attachment
GET    /tasks/:id/attachments          # Get task attachments

# Time Logging
POST   /tasks/:id/time-logs            # Create time log entry
GET    /tasks/:id/time-logs            # Get task time logs

# Task History & Notifications
GET    /tasks/:id/history              # Get task history
GET    /tasks/notifications            # Get user notifications
POST   /tasks/notifications/:id/read   # Mark notification as read
```

### Project Management Endpoints
```http
GET    /tasks/projects                 # Get all projects
GET    /tasks/projects/:id/tasks       # Get project tasks with pagination
POST   /tasks/projects/:id/team/add    # Add team member to project
POST   /tasks/projects/:id/team/remove # Remove team member from project
POST   /tasks/projects/:id/teams       # Add team to project
POST   /tasks/projects/:id/teams/:teamId/remove # Remove team from project
GET    /tasks/projects/:id/teams       # Get project teams
```

### Analytics & Reporting Endpoints
```http
GET    /progress/weekly-report         # Generate weekly report
GET    /progress/monthly-report        # Generate monthly report
GET    /progress/custom-report         # Generate custom report
GET    /progress/search                # Search tasks by date
GET    /progress/task-completion-rate  # Task completion analytics
GET    /progress/average-completion-time # Average completion time
GET    /progress/workload-distribution # Workload distribution analysis
GET    /progress/total-hours/user      # Total hours per user
GET    /progress/total-hours/task/:id  # Total hours per task

# PDF Report Downloads
GET    /progress/download-weekly-report-pdf    # Download weekly PDF
GET    /progress/download-custom-report-pdf    # Download custom PDF
POST   /progress/upload                        # Upload report files
GET    /progress/download/:filename            # Download specific file
```

### Chat System Endpoints
```http
POST   /chat/conversations             # Create new conversation
GET    /chat/conversations             # Get user conversations
GET    /chat/available-users           # Get available users for chat
GET    /chat/conversations/:id/messages # Get conversation messages
POST   /chat/conversations/:id/read    # Mark conversation as read
```

### Payment Endpoints
```http
POST   /payment/bonus                  # Create bonus payment
POST   /payment/update-payment-method  # Update payment method
POST   /payment/confirm                # Confirm payment
GET    /payment/status                 # Get payment status
GET    /payment/return                 # Handle payment return
```

### User Management Endpoints
```http
GET    /users/me                       # Get user profile
GET    /users/dashboard                # Get dashboard statistics
GET    /users/collaborators            # Get collaborators list (Manager only)
PATCH  /users/profile                  # Update user profile
PATCH  /users/password                 # Update password
PUT    /users/avatar                   # Update avatar (file upload)
PUT    /users/avatar/url               # Update avatar (URL)
```

## 🔒 Authentication

The API uses JWT tokens with automatic refresh capability:

1. **Login** to receive access token (stored in **HTTP-only** cookies)
2. **Tokens auto-refresh** when nearing expiration
3. **Role-based access** controls endpoint permissions
4. **Session management** with inactivity timeout

### Authorization Roles
- **MANAGER**: Full access to all features, team management, analytics
- **COLLABORATOR**: Task management, time logging, comments
- **ADMIN**: System administration, file downloads

## 📊 Analytics Features

### Available Reports
- **Task Completion Rate**: Performance metrics by user/project/team
- **Workload Distribution**: Task distribution analysis
- **Average Completion Time**: Efficiency metrics
- **Overdue Tasks**: Deadline management
- **Custom Date Range Reports**: Flexible reporting
- **PDF Generation**: Professional report exports

### Query Parameters for Analytics
```http
?startDate=2024-01-01
&endDate=2024-12-31
&projectId=1
&teamId=2
&userId=3
&page=1
&limit=10
&sort=ASC
```
### Development Guidelines
- Follow NestJS best practices
- Write unit tests for new features
- Update API documentation
- Follow TypeScript strict mode
- Use proper error handling

## 👤 Author

**Tamim Ahamed**
- GitHub: [@TamimAhamed26](https://github.com/TamimAhamed26)

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- TypeORM for excellent database integration
- Stripe for seamless payment processing
- All contributors to the open-source libraries used


⭐ **Star this repository if you find it helpful!**
