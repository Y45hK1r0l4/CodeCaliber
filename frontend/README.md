# CodeCaliber

CodeCaliber is an academic coding assessment platform for schools, universities, coding institutes, and any organization that teaches programming.

It gives an institution a structured place to create coding questions, organize teachers and students, publish timed tests, run code securely, and review student performance after an assessment.

CodeCaliber is not designed primarily as a public competitive-programming leaderboard. Its main purpose is classroom teaching, practical examinations, lab work, and measurable student progress.

## Product goal

The goal of CodeCaliber is to make programming education easier to manage and easier to measure.

Teachers should be able to:

- Create and reuse coding questions.
- Build tests from any number of questions.
- Assign a test to a classroom.
- Define how long a student has to complete the test.
- Define the period during which the test is available.
- See every student who was given the test.
- See who has not started, who is in progress, who submitted, and who expired.
- Review scores and submission times.
- Track student progress over time.

Students should be able to:

- Create an account and join their classroom.
- See tests assigned to them.
- Read questions and write code in the browser.
- Choose a supported programming language.
- Run or submit code against test cases.
- Complete several questions in one timed test.
- Save their work by submitting answers.
- Receive a final result when the test is submitted.

The super admin should be able to:

- Create the institution during initial signup.
- Manage the institution's teaching staff.
- Create teacher accounts and generate their credentials.
- Manage the question list.
- Oversee classrooms, tests, and performance.

## Role model

CodeCaliber has three application roles.

### Super admin

The first person to sign up on a new installation becomes the `super_admin`.

During signup, the super admin provides:

- Name
- School, university, or organization name
- Email address
- Password

CodeCaliber creates the institution automatically and gives the super admin full control.

The super admin can create teacher accounts directly. Teacher accounts are not created through an open public signup and are not dependent on an email invitation flow.

### Teacher

Teachers are created by the super admin. The platform generates a temporary password that the super admin gives to the teacher.

Teachers can:

- Create coding questions.
- Edit and maintain questions.
- Create classrooms.
- Add or remove students through classroom membership.
- Create tests.
- Add any number of questions to a test.
- Set test duration.
- Set test opening and closing times.
- Publish tests to a classroom.
- View performance for every student assigned the test.

### Student

Students create accounts through the normal signup flow. After signup, they can join a classroom using a classroom join code.

Students can:

- View their classrooms.
- View published tests.
- Start an available test once.
- Work within the server-enforced time limit.
- Submit answers for individual coding questions.
- Submit the complete test.

## Core workflow

### 1. Institution setup

1. The first account signs up.
2. CodeCaliber assigns that account the `super_admin` role.
3. The super admin enters the institution name.
4. CodeCaliber creates the institution record.

### 2. Teacher setup

1. The super admin opens the educator console.
2. The super admin enters a teacher's name and email.
3. CodeCaliber creates the teacher account.
4. CodeCaliber generates a temporary password.
5. The super admin securely gives the credentials to the teacher.
6. The teacher signs in and begins managing questions and tests.

### 3. Question creation

Teachers can create coding questions with:

- Title
- Description
- Difficulty
- Topic
- Visible test cases
- Hidden test cases
- Starter code
- Reference solutions
- Supported languages

Questions are reusable. A teacher can include the same question in multiple tests.

### 4. Classroom setup

Teachers create a classroom with:

- Class name
- Grade or year
- Academic year
- Section
- Institution

Each classroom receives a join code. Students use that code to join the classroom.

### 5. Test creation

A teacher creates a test by selecting:

- Test title
- Classroom
- Instructions
- Any number of questions
- Duration in minutes
- Opening date and time
- Closing date and time

The duration controls how long an individual student has after starting.

The opening and closing period controls when the test may be started.

The server enforces both rules. A student cannot bypass the time limit by changing the browser clock.

### 6. Student attempt

When a student starts a test:

1. CodeCaliber creates one attempt for that student and test.
2. The server records the start time.
3. The server calculates the expiry time.
4. The student sees the questions and countdown timer.
5. The student can move between questions.
6. The student can submit code for individual questions.
7. The student submits the final test.
8. The attempt is marked `submitted` or `expired`.

Only one attempt is currently allowed per student per test.

### 7. Teacher performance review

After publishing a test, the teacher can open its performance view.

The performance view includes every student in the classroom, not just students who submitted:

- Student name
- Student email
- Attempt status
- Score
- Total questions
- Submission time

Possible statuses include:

- `not_started`
- `in_progress`
- `submitted`
- `expired`

## Main features

### Question list

The question list is the reusable source of coding content. It supports multiple languages, visible and hidden validation cases, difficulty levels, topics, starter code, and reference solutions.

### Secure code execution

Code execution is handled by the Codebox services in the `Codebox/` directory. The backend can submit code for execution and collect:

- Accepted or failed status
- Runtime
- Memory usage
- Compilation errors
- Runtime errors
- Failed test case details

### Timed assessments

Tests combine questions into a structured assessment. Each test supports:

- Multiple questions
- A classroom
- A duration
- An opening period
- A closing period
- One student attempt
- Server-side expiry
- Performance reporting

### Classroom management

Classrooms group students around a teacher and an academic context such as:

- Grade
- Year
- Section
- Academic year

Students join with a classroom code. Teachers can retrieve classroom students and remove students when required.

### Teacher performance reporting

Teachers can review class-wide performance from the test performance page. The system includes students who did not start the test, which helps teachers identify missing work rather than only seeing successful submissions.

### AI assistance

The project includes AI-assisted endpoints for:

- Hints
- Error explanations
- Complexity analysis
- Question generation for administrators and teachers

AI assistance is intended to support learning and feedback. It should not replace teacher judgment or the student's own reasoning.

## Important frontend routes

| Route | Purpose |
|---|---|
| `/` | Public product homepage |
| `/signup` | Student or first super admin signup |
| `/login` | Sign in |
| `/classrooms` | View classrooms, assignments, and tests |
| `/problems` | Browse the question list |
| `/problem/:id` | Solve an individual question |
| `/test/:testId` | Start and complete a timed test |
| `/profile` | View the current user's profile |
| `/leaderboards` | View ranking data |
| `/admin` | Educator console for super admins and teachers |
| `/admin/createProblem` | Create a coding question |
| `/admin/editProblem` | Manage the question list |
| `/admin/createTest` | Create and publish a timed test |
| `/admin/register` | Create a teacher account |
| `/admin/test/:testId/performance` | Review student performance |
| `/admin/trackUsers` | Review institution users |

## Important backend routes

### Authentication

```text
POST /user/register
POST /user/login
POST /user/logout
GET  /user/check
GET  /user/getProfile
GET  /user/getAllUsers
POST /user/teachers
```

`POST /user/teachers` is restricted to the super admin and generates teacher credentials.

### Institutions and classrooms

```text
POST   /academic/institutions
POST   /academic/classrooms
GET    /academic/classrooms
POST   /academic/classrooms/join
GET    /academic/classrooms/:classroomId/students
DELETE /academic/classrooms/:classroomId/students/:studentId
GET    /academic/classrooms/:classroomId/assignments
GET    /academic/classrooms/:classroomId/progress
```

### Tests and attempts

```text
POST  /tests
GET   /tests/classroom/:classroomId
POST  /tests/:testId/start
PATCH /tests/attempts/:attemptId/answers
POST  /tests/attempts/:attemptId/submit
GET   /tests/:testId/performance
```

### Questions and submissions

```text
POST   /problem/create
GET    /admin/problems
GET    /problem/ProblemById/:id
PUT    /problem/update/:id
DELETE /problem/delete/:id
POST   /submission/run/:id
POST   /submission/submit/:id
```

When submitting a question as part of a timed test, the frontend passes the test attempt identifier so the submission is attached to that attempt.

## Technology stack

### Frontend

- React 19
- Vite
- React Router
- Redux Toolkit
- React Hook Form
- Zod
- Monaco Editor
- Tailwind CSS
- Lucide React
- Axios

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- Redis
- JWT authentication
- HTTP-only cookies
- bcrypt password hashing

### Code execution

- Codebox execution services
- Docker-based runtime images
- C++, Java, JavaScript, Python, and additional configured runtimes
- Queue and worker infrastructure
- Runtime and memory reporting

## Local development

### Requirements

- Node.js 18 or newer
- MongoDB
- Redis
- Codebox services or a configured code execution service

### Start the backend

```powershell
cd backend
npm install
npm run dev
```

The backend defaults to port `5000` unless `PORT` is set.

### Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server normally runs on port `5173`.

### Build the frontend

```powershell
cd frontend
npm run build
```

### Lint the frontend

```powershell
cd frontend
npm run lint
```

## Environment configuration

The backend requires environment values for the connected services. At minimum, configure:

```text
PORT=5000
JWT_KEY=replace-with-a-long-random-secret
MONGO_URI=mongodb://localhost:27017/CodeCaliber
REDIS_URL=redis://localhost:6379
```

The exact MongoDB and Redis variable names should match the configuration files in `backend/config/`.

The frontend API client is configured in:

```text
frontend/src/utils/axiosClient.js
```

Ensure its API base URL points to the running backend.

## Security and permissions

- Passwords are hashed before storage.
- Authentication uses JWTs stored in HTTP-only cookies.
- Student, teacher, and super admin access is checked by middleware.
- Teacher account creation is restricted to the super admin.
- Test access requires classroom membership.
- Test start and expiry are checked by the backend.
- A student cannot submit an attempt after it is submitted or expired.
- Code execution is separated into the Codebox execution services.
- Hidden test cases are never intended to be exposed to students.

For production use, add:

- Password reset and forced temporary-password changes
- Email delivery or a secure credential handoff
- Audit logs for teacher and super admin actions
- Rate limiting
- CSRF protection appropriate to the deployment architecture
- Stronger classroom and institution ownership checks
- Backup and retention policies for assessment data

## Current implementation boundaries

The core academic workflow is implemented, but a production institution rollout should still expand:

- Teacher password change after first login
- Teacher and super admin audit history
- Bulk student import
- Bulk teacher creation
- Parent or advisor reporting
- Question-level analytics
- Exportable marksheets
- Grading rules for partial scores
- Automatic notifications
- Rich charts for class performance
- Test answer review and manual grading
- Institution-level settings and branding
- Database migrations and seed scripts

The current performance view reports scores and attempt status. It is the foundation for deeper teacher analytics such as average score, completion rate, question difficulty, common errors, and student-level intervention recommendations.

## Product principles

1. **Teacher-led**: Teachers control what students see and when they see it.
2. **Assessment-first**: Tests are made from reusable questions and have explicit timing rules.
3. **Useful visibility**: Teachers see all assigned students, not only successful submissions.
4. **Secure execution**: Student code is executed in an isolated environment.
5. **Clear roles**: Super admin, teacher, and student permissions remain easy to understand.
6. **Learning over gamification**: Rankings can exist, but classroom progress and understanding come first.
7. **Institution-ready**: The system should work for a school, university department, coding bootcamp, or lab.

## Project status

The frontend production build and the academic backend syntax checks currently pass.

CodeCaliber is an actively evolving academic assessment platform. The most important next product milestone is completing the full teacher dashboard: teacher-created classrooms, student management, test publishing, and richer performance analytics in one cohesive workspace.

