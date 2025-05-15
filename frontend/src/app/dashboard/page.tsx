"use client";
import React, { useEffect, useState } from "react";
import { Upload, Button, List, Progress, message } from "antd";
import { apiClient } from "@/lib/api-client";
import { file } from "@/lib/file";
import socket from "@/lib/socket";

interface FileItem {
  _id: string;
  filename: string;
  originalname: string;
  path: string;
  size: number;
  user: string;
  status: string;
  resultName?: string;
  uploadedAt: string;
  progress?: number;
}

const FileUploadPage = () => {
  const [fileList, setFileList] = useState<FileItem[]>([]);

  useEffect(() => {
    fetchFiles();
  }, []);
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to socket.io server", socket.id);
    });

    socket.on(
      "process-completed",
      (data: { fileName: string; resultName: string }) => {
        console.log(data, fileList);
        setFileList((prevFiles) =>
          prevFiles.map((file) => {
            if (file.path === data.fileName) {
              return {
                ...file,
                status: "completed",
                resultName: data.resultName,
              };
            }
            return file;
          })
        );
        console.log(data, fileList);
      }
    );
    return () => {
      socket.off("connect");
      socket.off("process-completed");
    };
  }, [fileList]);

  const fetchFiles = async () => {
    try {
      const response = await file.getAllFiles();
      setFileList(response);
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch files.");
    }
  };

  const uploadFileInChunks = async (file: File) => {
    const CHUNK_SIZE = 1024 * 1024; // 1MB per chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const updatedFileList = [
      ...fileList,
      {
        _id: uploadId,
        filename: file.name,
        originalname: file.name,
        path: "",
        size: file.size,
        user: "",
        status: "uploading",
        uploadedAt: new Date().toISOString(),
        progress: 0,
      } as FileItem,
    ];

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const sendData = new FormData();
      sendData.append("file", chunk, file.name);
      sendData.append("uploadId", uploadId);
      sendData.append("chunkIndex", String(chunkIndex));
      sendData.append("totalChunks", String(totalChunks));

      try {
        const response = await apiClient.post("/upload", sendData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (event.total) {
              const chunkProgress =
                (event.loaded / event.total) * (1 / totalChunks);
              const progress = Math.min(
                100,
                Math.round((chunkIndex + chunkProgress) * (100 / totalChunks))
              );
              const fileToUpdate = updatedFileList.find(
                (f) => f.filename === file.name
              );
              if (fileToUpdate) fileToUpdate.progress = progress;
              setFileList([...updatedFileList]);
            }
          },
        });

        if (response.data.isComplete) {
          const newFile: FileItem = {
            _id: response.data._id,
            filename: file.name,
            originalname: file.name,
            path: response.data.path,
            size: file.size,
            user: "",
            status: response.data.status,
            resultName: response.data.resultName,
            uploadedAt: new Date().toISOString(),
            progress: 100,
          };
          const index = updatedFileList.findIndex(
            (f) => f.filename === file.name
          );
          updatedFileList[index] = newFile;
          setFileList([...updatedFileList]);
        }
      } catch (error) {
        console.error(error);
        message.error("Upload failed.");
      }
    }
  };

  const handleUpload = (file: File) => {
    uploadFileInChunks(file);
  };

  const downloadFile = async (resultName: string) => {
    try {
      const response = await apiClient.get(`/upload/${resultName}`, {
        responseType: "blob", // Important for binary data
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      window.open(url, "_blank");
    } catch (error) {
      console.error(error);
      message.error("Failed to download file.");
    }
  };

  return (
    <div className="flex justify-start pt-10 flex-col h-[100vh] bg-gray-100">
      <div className="w-full md:w-1/2 mx-auto bg-white p-5 md:p-10 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mt-10">Aggregated Sales Report</h2>
        <Upload
          accept=".csv"
          beforeUpload={handleUpload}
          showUploadList={false}
          className="mt-10"
        >
          <Button type="primary">Upload File</Button>
        </Upload>
        <List
          itemLayout="vertical"
          dataSource={fileList}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.filename}
                description={
                  item.status === "processing" ? (
                    "Processing..."
                  ) : item.resultName ? (
                    <Button
                      onClick={() =>
                        item.resultName && downloadFile(item.resultName)
                      }
                    >
                      Download
                    </Button>
                  ) : item.progress != 100 ? (
                    "Uploading..."
                  ) : (
                    "processing"
                  )
                }
              />
              {item.progress !== undefined && (
                <Progress percent={item.progress} />
              )}
            </List.Item>
          )}
        />
      </div>
    </div>
  );
};

export default FileUploadPage;
