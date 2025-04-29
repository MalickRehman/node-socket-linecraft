# LineCraft Employee Management Application

A comprehensive Node.js application for employee/roster management, built to facilitate communication between LineCraft and potential employees.

## Features

- **User Authentication and Management**

  - User registration and login
  - Admin approval of new user accounts
  - User profile management

- **Global Messaging**

  - Open chat channel with ping system
  - Private 1-to-1 messaging between users

- **Job Opportunities**

  - Admin creation of job opportunities with details
  - User express interest in opportunities
  - Admin selection of candidates

- **Event Management**

  - Automatic event creation from filled opportunities
  - Event-specific chat rooms
  - Event lifecycle management

- **Admin Functions**

  - User management (approve/deny, role management)
  - Opportunity and event management
  - Roster management

- **Notifications**
  - Push notifications for messages, job opportunities, and events

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Real-time Communication**: Socket.io
- **Authentication**: JWT
- **Validation**: Express Validator
- **Logging**: Winston

## Project Structure

```
linecraft-app/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middlewares/     # Express middlewares
├── models/          # Mongoose schemas
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB

### Installation

1. Clone the repository

   ```
   git clone https://github.com/yourusername/linecraft-app.git
   cd linecraft-app
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables

   ```
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/linecraft
   JWT_SECRET=linecraftsecret
   JWT_EXPIRATION=1d
   DB_NAME=linecraft
   ```

4. Start the development server
   ```
   npm run dev
   ```

### Building for Production

```
npm run build
npm start
```

## API Documentation

### Authentication Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get authentication token
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### User Management Routes (Admin only)

- `GET /api/users` - Get all users
- `GET /api/users/pending` - Get users pending approval
- `PUT /api/users/:id/approval` - Approve or reject user
- `PUT /api/users/:id/role` - Update user role
- `DELETE /api/users/:id` - Delete user

### Message Routes

- `POST /api/messages/global` - Send a global message
- `GET /api/messages/global` - Get global messages
- `POST /api/messages/private/:recipientId` - Send a private message
- `GET /api/messages/private/:userId` - Get private messages with a user
- `GET /api/messages/chats` - Get private chats list
- `POST /api/messages/event/:eventId` - Send an event message
- `GET /api/messages/event/:eventId` - Get event messages
- `GET /api/messages/unread` - Get unread message counts

### Opportunity Routes

- `POST /api/opportunities` - Create new job opportunity (Admin)
- `GET /api/opportunities` - Get all job opportunities
- `GET /api/opportunities/:id` - Get opportunity by ID
- `PUT /api/opportunities/:id` - Update opportunity (Admin)
- `DELETE /api/opportunities/:id` - Delete opportunity (Admin)
- `POST /api/opportunities/:id/interest` - Express interest in opportunity
- `PUT /api/opportunities/:id/select/:userId` - Select user for opportunity (Admin)
- `POST /api/opportunities/:id/close` - Close opportunity and create event (Admin)

### Event Routes

- `GET /api/events` - Get all events (Admin)
- `GET /api/events/my-events` - Get user's events
- `GET /api/events/:id` - Get event by ID
- `PUT /api/events/:id` - Update event (Admin)
- `PUT /api/events/:id/complete` - Complete event (Admin)
- `PUT /api/events/:id/cancel` - Cancel event (Admin)
- `PUT /api/events/:id/participants/:userId` - Update participant status (Admin)

## Socket.IO Events

- `connection` - User connected
- `disconnect` - User disconnected
- `globalMessage` - Global chat message
- `joinRoom` - Join specific event room
- `eventMessage` - Event-specific message
- `privateMessage` - Private message between users

## License

This project is licensed under the ISC License
