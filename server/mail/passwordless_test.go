package mail

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPasswordlessTemplateKeepsTokenOutOfRequestURL(t *testing.T) {
	templateBytes, err := os.ReadFile("templates/passwordless.html")
	require.NoError(t, err)
	templateText := string(templateBytes)
	require.True(t, strings.Contains(templateText, `/login/email#token={{.Token}}`))
	require.False(t, strings.Contains(templateText, `/login/mfa/{{.Token}}`))
}
