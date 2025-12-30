# Use Node.js LTS (Long Term Support) alpine version for a smaller image
FROM node:18-alpine
# Set the working directory inside the container
WORKDIR /app
# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
# Install project dependencies
RUN npm install
# Copy the rest of the application code to the working directory
COPY . .
# Build the NestJs application
RUN npm run build
# Expose the port that the application will run on
EXPOSE 3000
# Start the application using the built files
CMD ["npm", "run", "start:prod"]

