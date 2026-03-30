import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your Firebase project connection
const firebaseConfig = {
  databaseURL: "https://esp32-access-log-8c91d-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);