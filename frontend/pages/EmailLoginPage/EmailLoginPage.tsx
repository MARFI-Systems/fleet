import React, { useContext, useLayoutEffect, useRef, useState } from "react";
import { InjectedRouter } from "react-router";

import AuthenticationFormWrapper from "components/AuthenticationFormWrapper";
import Button from "components/buttons/Button";
import { AppContext } from "context/app";
import { RoutingContext } from "context/routing";
import paths from "router/paths";
import configAPI from "services/entities/config";
import sessionsAPI from "services/entities/sessions";
import authToken from "utilities/auth_token";

interface IEmailLoginPageProps {
  router: InjectedRouter;
}

const EmailLoginPage = ({ router }: IEmailLoginPageProps) => {
  const {
    config,
    setAvailableTeams,
    setConfig,
    setCurrentUser,
    setCurrentTeam,
  } = useContext(AppContext);
  const { redirectLocation } = useContext(RoutingContext);
  const [token, setToken] = useState(
    () =>
      new URLSearchParams(window.location.hash.substring(1)).get("token") || "",
  );
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);

  useLayoutEffect(() => {
    // Keep credentials out of browser history, subsequent URLs, and telemetry.
    // The fragment is never included in an HTTP request to the server.
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);

  const finishSignIn = async () => {
    if (inFlight.current || !token || error) {
      return;
    }
    inFlight.current = true;
    setIsSubmitting(true);
    try {
      const {
        user,
        available_teams,
        token: sessionToken,
        token_expires_at,
      } = await sessionsAPI.finishMFA({ token });
      setToken("");
      authToken.save(
        sessionToken,
        token_expires_at ? new Date(token_expires_at) : undefined,
      );
      setCurrentUser(user);
      setAvailableTeams(user, available_teams);
      setCurrentTeam(undefined);
      if (!user.global_role && user.teams.length === 0) {
        router.replace(paths.NO_ACCESS);
        return;
      }
      if (user.force_password_reset) {
        router.replace(paths.RESET_PASSWORD);
        return;
      }
      if (!config) {
        setConfig(await configAPI.loadAll());
      }
      router.replace(redirectLocation || paths.DASHBOARD);
    } catch {
      // Do not log exceptions that may contain a request body or credential.
      setToken("");
      setError(true);
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  if (error || (!token && !isSubmitting)) {
    return (
      <AuthenticationFormWrapper header="Sign-in link unavailable">
        <p>
          This link has expired, was already used, or could not be verified.
        </p>
        <Button onClick={() => router.replace(paths.LOGIN)}>
          Request a new sign-in link
        </Button>
      </AuthenticationFormWrapper>
    );
  }

  return (
    <AuthenticationFormWrapper header="Sign in to Fleet">
      <p>Continue to sign in with this one-time email link.</p>
      <Button
        onClick={finishSignIn}
        disabled={isSubmitting}
        isLoading={isSubmitting}
      >
        Continue signing in
      </Button>
    </AuthenticationFormWrapper>
  );
};

export default EmailLoginPage;
