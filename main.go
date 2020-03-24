package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Profile struct {
	Port     int    `json:"port"`
	AdminPwd string `json:"admin_pwd"`
}

const profilePath string = "config.json"

// Override the detection of Golang which is not satisfying.
func GetFileContentType(path string) (string, error) {
	if strings.HasSuffix(path, ".html") {
		return "text/html", nil
	} else if strings.HasSuffix(path, ".css") {
		return "text/css", nil
	} else if strings.HasSuffix(path, ".js") {
		return "text/javascript", nil
	} else if strings.HasSuffix(path, ".svg") {
		return "image/svg+xml", nil
	}
	buffer := make([]byte, 512)
	out, err := os.Open(path)
	if err != nil {
		return "", err
	}
	_, err2 := out.Read(buffer)
	if err2 != nil {
		return "", err2
	}

	contentType := http.DetectContentType(buffer)

	return contentType, nil
}

func checkError(err error, guest string) {
	if err != nil {
		fmt.Printf("Error while communicating with %s: %s", guest, err.Error())
		fmt.Println()
	}
}

func responseFile(w http.ResponseWriter, path string, shared bool, r *http.Request) {
	src := "site/"
	if shared {
		src += "shared/" + path
	} else {
		src += path
	}
	// Set MIME type
	mime, err2 := GetFileContentType(src)
	if err2 == nil {
		w.Header().Set("Content-Type", mime)
	}
	// Send file
	file, err := os.Open(src)
	if err != nil {
		log.Printf("Error while reading file at shared/%s: %s", src, err.Error())
		return
	}
	log.Printf("Sending %s to %s as %s", path, r.RemoteAddr, mime)
	_, err3 := io.Copy(w, file)
	checkError(err3, r.RemoteAddr)
	file.Close()
}

func homepage(w http.ResponseWriter, r *http.Request) {
	if r.RequestURI != "/" {
		if strings.HasPrefix(r.RequestURI, "/shared/") {
			responseFile(w, r.RequestURI[1:], false, r)
			return
		}
		w.WriteHeader(404)
		_, err := fmt.Fprintf(w, "没有这样的索引: %s", r.RequestURI)
		checkError(err, r.RemoteAddr)
	} else {
		responseFile(w, "home.html", false, r)
	}
}

func aboutPage(w http.ResponseWriter, r *http.Request) {
	parse, err := url.Parse(r.RequestURI)
	if err != nil && parse != nil {
		if len(parse.Query()) >= 0 {

			return
		}
	}
	responseFile(w, "about.html", false, r)
}

func main() {
	log.Printf("Reading profile at %s", profilePath)

	var profile Profile
	fallback := func() {
		log.Println("Falling back.")
		profile = Profile{
			Port:     3000,
			AdminPwd: "qwerty",
		}
	}
	startServer := func() {
		log.Println("Listen on port", profile.Port)
		log.Println("Admin password is", profile.AdminPwd)
		http.HandleFunc("/", homepage)
		http.HandleFunc("/about", aboutPage)
		log.Fatal(http.ListenAndServe(":"+strconv.FormatInt(int64(profile.Port), 10), nil))
	}

	// Parse JSON
	// Open file
	file, err := os.Open(profilePath)
	if err != nil {
		log.Println("Could not open", profilePath)
		// If fault, use default settings.
		fallback()
	} else {
		// If success
		err := json.NewDecoder(file).Decode(&profile)
		if err != nil {
			log.Println("Failed to unmarshal", profilePath+":", err)
			fallback()
		}
		defer log.Fatal(file.Close())
	}
	startServer()
}
