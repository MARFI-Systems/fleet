package mail

import (
	"bytes"
	"html/template"
	"time"

	"github.com/fleetdm/fleet/v4/server"
	"github.com/fleetdm/fleet/v4/server/fleet"
)

// PasswordlessMailer builds the email-first login message. The token is placed
// in a URL fragment so browsers and reverse proxies do not include it in HTTP
// requests or access logs before the frontend explicitly exchanges it.
type PasswordlessMailer struct {
	FullName     string
	Token        string
	BaseURL      template.URL
	AssetURL     template.URL
	CurrentYear  int
	TTLInMinutes float64
}

func (i *PasswordlessMailer) Message() ([]byte, error) {
	i.CurrentYear = time.Now().Year()
	i.TTLInMinutes = fleet.MFALinkTTL.Truncate(time.Minute).Minutes()
	t, err := server.GetTemplate("server/mail/templates/passwordless.html", "email_template")
	if err != nil {
		return nil, err
	}

	var msg bytes.Buffer
	if err = t.Execute(&msg, i); err != nil {
		return nil, err
	}
	return msg.Bytes(), nil
}
