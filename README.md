# Payments

## Docker compose yml file
```
version: '2'
services:
  payments-backend:
    image: docker.io/kodershq/payments-backend
    environment:
      - REDMINE_URL=YOUR_REDMINE_URL
      - APP_URL=YOUR_FRONTEND_APP_URL
      - STRIPE_SK=YOUR_STRIPE_SECRET
    ports:
      - '9441:8080'
  payments-frontend:
    image: docker.io/kodershq/payments-frontend 
    ports:
      - '9442:8080'
    depends_on:
      - payments-backend
    environment:
      - BASE_URL=YOUR_BACKEND_APP_URL
```