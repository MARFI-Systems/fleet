import React, { useEffect, useState } from "react";
import { useQuery } from "react-query";
import { InjectedRouter } from "react-router";
import PATHS from "router/paths";
import sessionsAPI from "services/entities/sessions";
import usersAPI from "services/entities/users";
import formatErrorResponse from "utilities/format_error_response";

// @ts-ignore
import ForgotPasswordForm from "components/forms/ForgotPasswordForm";
import AuthenticationNav from "components/AuthenticationNav";
import AuthenticationFormWrapper from "components/AuthenticationFormWrapper";
import CustomLink from "components/CustomLink";
import Spinner from "components/Spinner";

interface IForgotPasswordPage {
  router: InjectedRouter;
  location?: { search: string };
}

const ForgotPasswordPage = ({ router, location }: IForgotPasswordPage) => {
  const recoveryLogin =
    new URLSearchParams(location?.search || "").get("recovery") === "1";
  const {
    data: authSettings,
    isLoading: loadingAuthSettings,
    isError: authSettingsError,
  } = useQuery(["ssoSettings"], () => sessionsAPI.ssoSettings());
  const magicLinkEnabled = !!authSettings?.settings.email_passwordless_enabled;

  useEffect(() => {
    if (magicLinkEnabled && !recoveryLogin) {
      router.replace(PATHS.LOGIN);
    }
  }, [magicLinkEnabled, recoveryLogin, router]);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const baseClass = "forgot-password";

  useEffect(() => {
    setErrors({});
  }, []);

  const handleSubmit = async (formData: { email: string }) => {
    setIsLoading(true);
    try {
      await usersAPI.forgotPassword(formData);

      setEmail(formData.email);
      setErrors({});
    } catch (response) {
      const errorObject = formatErrorResponse(response);
      setEmail("");
      setErrors(errorObject);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (email) {
      return (
        <div className={`${baseClass}__text-wrapper`}>
          <p className={`${baseClass}__text`}>
            An email was sent to{" "}
            <span className={`${baseClass}__email`}>{email}</span>. Click the
            link in the email to proceed with the password reset process. If you
            did not receive an email please contact your Fleet administrator.
            <br />
            <br />
            You can find more information on resetting passwords at the{" "}
            <CustomLink
              url="https://fleetdm.com/docs/using-fleet/fleetctl-cli?utm_medium=fleetui&utm_campaign=get-api-token#using-fleetctl-with-an-api-only-user"
              text="Password reset FAQ"
              newTab
            />
          </p>
        </div>
      );
    }

    return (
      <ForgotPasswordForm
        handleSubmit={handleSubmit}
        onChangeFunc={() => setErrors({})}
        serverErrors={errors}
        isLoading={isLoading}
      />
    );
  };

  if (loadingAuthSettings || (magicLinkEnabled && !recoveryLogin)) {
    return <Spinner />;
  }

  if (authSettingsError) {
    return (
      <AuthenticationFormWrapper header="Sign-in unavailable">
        <CustomLink url={PATHS.LOGIN} text="Return to sign-in and try again" />
      </AuthenticationFormWrapper>
    );
  }

  return (
    <AuthenticationFormWrapper
      header="Reset password"
      headerCta={
        <AuthenticationNav
          previousLocation={
            recoveryLogin ? `${PATHS.LOGIN}?recovery=1` : PATHS.LOGIN
          }
          router={router}
        />
      }
      className={baseClass}
    >
      {renderContent()}
    </AuthenticationFormWrapper>
  );
};

export default ForgotPasswordPage;
