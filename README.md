# CSV Sales Aggregator

## Overview

This full-stack project includes:

* **Backend:** Express.js API for chunked CSV file uploads, streaming aggregation of sales data, and providing downloadable results.
* **Frontend:** Next.js app using Ant Design (antd) UI for user registration/login, file upload with progress, and real-time status & download links.
* **Real-time updates:** Socket.IO for job completion notifications.
* **Data storage:** MongoDB for user and file metadata.
* **Queue & cache:** Redis with BullMQ for background job processing and socket session management.
* **Dockerized:** Backend, MongoDB, and Redis run as Docker containers.

---

## Architecture & Features

### Frontend (Next.js + Ant Design)

* Clean UI with Ant Design components.
* Handles chunked file uploads showing real-time progress.
* Displays processing status and download links upon completion.
* Integrates Socket.IO for live updates.

### Backend (Express.js)

* JWT-based user authentication.
* Chunked file upload support for large CSV files.
* Streaming CSV parsing (`fs.createReadStream`) for memory-efficient processing.
* Aggregation runs as BullMQ background jobs.
* Socket.IO notifications for job progress and completion.
* Redis stores socket sessions to support scaling across multiple instances.

---

## Performance & Scalability

### Stream-based CSV Processing

* Reads CSV files line-by-line, so memory usage remains low regardless of file size.
* **Time complexity:** *O(n)* where *n* = number of CSV rows, since each row is processed once.
* **Space complexity:** *O(d)* where *d* = number of unique departments, as aggregation results are stored in a map keyed by department.
* Streaming avoids loading the entire file into memory, enabling efficient handling of very large files.

### BullMQ + Socket.IO

* BullMQ queues aggregation jobs, allowing asynchronous and scalable processing.
* Multiple worker instances can run in parallel for high throughput.
* Socket.IO sends real-time notifications to users about upload progress and job completion.
* Redis tracks socket connections, enabling multi-instance horizontal scaling and consistent user updates.

---

## Running the Project with Docker

You can start the backend, MongoDB, and Redis containers using Docker Compose:

```bash
docker-compose up --build
```

The Next.js frontend runs separately and connects to the backend API.

---

## Usage Flow

1. User registers and logs in via the Next.js frontend.
2. User uploads CSV file in chunks with a progress bar.
3. When upload completes, the backend queues an aggregation job.
4. Worker processes the CSV file in a streaming manner, aggregating sales per department.
5. On job completion, a Socket.IO event notifies the user.
6. The frontend shows a download button to get the aggregated CSV report.

---

## Testing

* **Unit tests** cover core aggregation logic, including handling of CSV rows, aggregation accuracy.
* Run tests locally or inside Docker with:

```bash
npm test
```

or inside the Docker container:

```bash
docker exec -it <backend_container_name> npm test
```

