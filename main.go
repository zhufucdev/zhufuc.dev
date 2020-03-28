package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Profile struct {
	Port      int    `json:"port"`
	AdminPwd  string `json:"admin_pwd"`
	BlackMost int    `json:"black_most"`
}

const profilePath string = "config.json"
const constantsPath string = "site/shared/constants.json"

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

func checkError(err error, guest string) bool {
	if err != nil {
		fmt.Printf("Error while communicating with %s: %s", guest, err.Error())
		fmt.Println()
		return false
	}
	return true
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
	if err == nil && parse != nil {
		if len(parse.Query()) > 0 {
			switch parse.Query().Get("request") {
			case "get":
				switch parse.Query().Get("what") {
				case "constants":
					responseFile(w, strings.TrimPrefix(constantsPath, "site/"), false, r)
				}
			}
			return
		}
	}
	responseFile(w, "about.html", false, r)
}

var blacklist map[string]int
var registeredManager map[uuid.UUID]time.Time

func isLogin(r *http.Request) bool {
	cookie, err := r.Cookie("passport")
	if err != nil || cookie == nil {
		return false
	}
	parse, err := uuid.Parse(cookie.Value)
	if err != nil {
		return false
	}
	for v, e := range registeredManager {
		if v == parse {
			if e.Before(time.Now()) {
				// If the passport has expired.
				delete(registeredManager, v)
				return false
			}
			return true
		}
	}
	return false
}

func managePage(w http.ResponseWriter, r *http.Request) {
	parse, err := url.Parse(r.RequestURI)
	if err == nil && parse != nil {
		if len(parse.Query()) > 0 {
			switch parse.Query().Get("request") {
			case "validate":
				if blacklist[r.RemoteAddr] >= profile.BlackMost {
					w.WriteHeader(406)
					return
				}
				buff := new(bytes.Buffer)
				_, err = buff.ReadFrom(r.Body)
				if !checkError(err, r.RemoteAddr) {
					return
				}
				pwd := buff.String()
				encoder := json.NewEncoder(w)
				if pwd == profile.AdminPwd {
					if !isLogin(r) {
						// If the client hasn't had a cookies which signs that it's login
						random, err2 := uuid.NewRandom()
						if err2 != nil {
							log.Printf("Failed to register manager: %s", err2)
							return
						}
						// Register its passport
						expires := time.Now().AddDate(0, 0, 1)
						cookie := &http.Cookie{
							Name:    "passport",
							Value:   random.String(),
							Expires: expires,
						}
						registeredManager[random] = expires
						http.SetCookie(w, cookie)
					}
					err = encoder.Encode(map[string]int{
						"result": 0,
					})
				} else {
					if _, ok := blacklist[r.RemoteAddr]; !ok {
						blacklist[r.RemoteAddr] = 0
					}
					blacklist[r.RemoteAddr]++
					err = encoder.Encode(map[string]int{
						"result": 1,
					})
				}
				checkError(err, r.RemoteAddr)
			case "set":
				if !isLogin(r) {
					w.WriteHeader(403)
					return
				}
				check := func(err error) bool {
					if err != nil {
						log.Printf("[manage] Failed to read constants at %s: %s", constantsPath, err)
						return false
					}
					return true
				}
				// Prepare
				what := parse.Query().Get("what") // What to change
				contentDecoder := json.NewDecoder(r.Body)
				var contents interface{} // New data
				err := contentDecoder.Decode(&contents)

				if err != nil {
					log.Println("[manage] Failed to read changes from remote.")
					w.WriteHeader(406)
					return
				}
				file, err := os.Open(constantsPath)
				if !check(err) {
					return
				}
				decoder := json.NewDecoder(file)
				jsonMap := make(map[string]interface{}) // JSON on the disk
				err = decoder.Decode(&jsonMap)
				if !check(err) {
					return
				}
				// Set
				jsonMap[what] = contents
				// Write

				file, err = os.Create(constantsPath)
				if !check(err) {
					return
				}
				buff := new(bytes.Buffer)
				encoder := json.NewEncoder(buff)
				err = encoder.Encode(jsonMap)
				if err != nil {
					log.Printf("[manage] Failed to write changes from remote: %s", err)
					w.WriteHeader(417)
				} else {
					defer file.Close()
					_, err = file.Write(buff.Bytes())
					if err != nil {
						log.Printf("[manage] Failed to write changes to disk: %s", err)
						w.WriteHeader(417)
					} else {
						w.WriteHeader(200)
					}
				}
			}
			return
		}
	}
	responseFile(w, "manage.html", false, r)
}

func settingsPage(w http.ResponseWriter, r *http.Request) {
	responseFile(w, "settings.html", false, r)
}

var profile Profile

func main() {
	log.Printf("Reading profile at %s", profilePath)

	fallback := func() {
		log.Println("Falling back.")
		profile = Profile{
			Port:     3000,
			AdminPwd: "qwerty",
		}
	}
	startServer := func() {
		blacklist = make(map[string]int)
		registeredManager = make(map[uuid.UUID]time.Time)
		log.Println("Listen on port", profile.Port)
		log.Println("Admin password is", profile.AdminPwd)
		http.HandleFunc("/", homepage)
		http.HandleFunc("/about", aboutPage)
		http.HandleFunc("/manage", managePage)
		http.HandleFunc("/settings", settingsPage)
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
