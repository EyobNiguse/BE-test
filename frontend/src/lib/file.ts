import { apiClient } from "./api-client";

export const file = {
    getAllFiles: async () => {
        const response = await apiClient.get("/upload");
        return response.data;
    }
}