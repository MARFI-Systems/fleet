import { render, screen } from "@testing-library/react";
import React from "react";

import { renderWithSetup } from "test/test-utils";

import LoginForm from "./LoginForm";

const [validEmail, invalidEmail] = ["hi@thegnar.co", "invalid-email"];
const password = "p@ssw0rd";

describe("LoginForm - component", () => {
  const settings = { sso_enabled: false };
  const submitSpy = jest.fn();
  const baseError = "Unable to authenticate the current user";

  it("renders the base error", () => {
    render(
      <LoginForm
        baseError={baseError}
        handleSubmit={submitSpy}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );

    expect(screen.getByText(baseError)).toBeInTheDocument();
  });

  it("should not render the base error", () => {
    render(
      <LoginForm
        handleSubmit={submitSpy}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );

    expect(screen.queryByText(baseError)).not.toBeInTheDocument();
  });

  it("renders 2 InputField components", () => {
    render(
      <LoginForm
        handleSubmit={submitSpy}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );

    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("rejects an empty or invalid email field without submitting", async () => {
    const { user } = renderWithSetup(
      <LoginForm
        handleSubmit={submitSpy}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );

    // enter a valid password
    await user.type(screen.getByPlaceholderText("Password"), password);

    // try to log in
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(
      screen.getByText("Email field must be completed"),
    ).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();

    // enter an invalid email
    await user.type(screen.getByPlaceholderText("Email"), invalidEmail);

    // try to log in again
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(
      screen.getByText("Email must be a valid email address"),
    ).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("rejects an empty password field without submitting", async () => {
    const { user } = renderWithSetup(
      <LoginForm
        handleSubmit={submitSpy}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );

    await user.type(screen.getByPlaceholderText("Email"), validEmail);

    // try to log in without entering a password
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      screen.getByText("Password field must be completed"),
    ).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("does not submit the form when both fields are empty", async () => {
    const { user } = renderWithSetup(
      <LoginForm
        handleSubmit={submitSpy}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("submits the form data when valid form data is submitted", async () => {
    const { user } = renderWithSetup(
      <LoginForm
        handleSubmit={submitSpy}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );

    await user.type(screen.getByPlaceholderText("Email"), validEmail);
    await user.type(screen.getByPlaceholderText("Password"), password);
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(submitSpy).toHaveBeenCalledWith({
      email: validEmail,
      password,
    });
  });
  it("tabs in the expected order", async () => {
    const { user } = renderWithSetup(
      <LoginForm
        handleSubmit={submitSpy}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={{
          sso_enabled: true,
          idp_name: "Test IdP",
        }}
      />,
    );

    expect(screen.getByPlaceholderText("Email")).toHaveFocus();
    await user.tab();
    expect(screen.getByPlaceholderText("Password")).toHaveFocus();
    await user.tab();
    expect(screen.getByText("Log in").parentElement).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("button", { name: /sign in with sso/i }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByText("Forgot password?")).toHaveFocus();
  });
});

describe("LoginForm - email-only sign-in", () => {
  const settings = { sso_enabled: false, email_passwordless_enabled: true };

  it("shows only email and removes password recovery", () => {
    render(
      <LoginForm
        handleSubmit={jest.fn()}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send sign-in link" }),
    ).toBeInTheDocument();
  });

  it("submits email without requiring a password", async () => {
    const submit = jest.fn().mockResolvedValue(undefined);
    const { user } = renderWithSetup(
      <LoginForm
        handleSubmit={submit}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );
    await user.type(screen.getByPlaceholderText("Email"), validEmail);
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));
    expect(submit).toHaveBeenCalledWith({ email: validEmail, password: "" });
  });

  it("rejects invalid email before requesting a link", async () => {
    const submit = jest.fn();
    const { user } = renderWithSetup(
      <LoginForm
        handleSubmit={submit}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
      />,
    );
    await user.type(screen.getByPlaceholderText("Email"), invalidEmail);
    await user.click(screen.getByRole("button", { name: "Send sign-in link" }));
    expect(
      screen.getByText("Email must be a valid email address"),
    ).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not reveal whether an account exists", () => {
    render(
      <LoginForm
        handleSubmit={jest.fn()}
        isSubmitting={false}
        pendingEmail
        ssoSettings={settings}
      />,
    );
    expect(
      screen.getByText(/is eligible for email sign-in/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/We sent an email to you/),
    ).not.toBeInTheDocument();
  });

  it("retains the explicitly selected recovery form", () => {
    render(
      <LoginForm
        handleSubmit={jest.fn()}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={settings}
        recoveryLogin
      />,
    );
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("Forgot password?")).toHaveAttribute(
      "href",
      expect.stringContaining("recovery=1"),
    );
  });

  it("keeps SSO available alongside email sign-in", () => {
    render(
      <LoginForm
        handleSubmit={jest.fn()}
        isSubmitting={false}
        pendingEmail={false}
        ssoSettings={{ ...settings, sso_enabled: true }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /sign in with sso/i }),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();
  });
});
