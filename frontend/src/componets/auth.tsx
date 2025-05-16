"use client";
import React, { useState } from "react";
import { Tabs, Form, Input, Button, message } from "antd";
import { useRouter } from "next/navigation";
import { SignupCredentials, LoginCredentials } from "@/types/types";
import { auth } from "@/lib/auth";

const AuthPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const validatePassword = (password: string) => {
    const passwordStrengthRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordStrengthRegex.test(password);
  };

  const onLoginFinish = async (values: LoginCredentials) => {
    setIsLoading(true);
    try {
      await auth.login(values);
      message.success("Login successful!");
      router.push("/dashboard"); // Redirect to dashboard page
    } catch (error) {
      message.error(`${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupFinish = async (values: SignupCredentials) => {
    setIsLoading(true);
    try {
      if (!validatePassword(values.password)) {
        setPasswordError(
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        );
        return;
      }
      setPasswordError("");
      await auth.signup(values);
      message.success("Registration successful!");
      router.push("/"); // Redirect to login page
    } catch (error) {
      message.error(`${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  // itams for tab pane view
  const items = [
    {
      key: "1",
      label: "Login",
      children: (
        <Form name="login" onFinish={onLoginFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Please input your email!" }]}
          >
            <Input style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>
              Login
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: "2",
      label: "Sign Up",
      children: (
        <Form name="signup" onFinish={onSignupFinish}>
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Please input your email!" }]}
          >
            <Input style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please input your password!" },
              {
                validator: (_, value) =>
                  !value || validatePassword(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error("Invalid password format")),
              },
            ]}
          >
            <div>
              <Input.Password style={{ width: "100%" }} />
              {passwordError && <p style={{ color: "red" }}>{passwordError}</p>}
            </div>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={isLoading}>
              Register
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div className="max-w-[500px] mx-auto p-5 bg-gray-50 rounded-md shadow-md">
      <h2 style={{ textAlign: "center" }}>Welcome</h2>
      <Tabs items={items} />
    </div>
  );
};

export default AuthPage;
