package main

import (
	"bytes"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Profile struct {
	Port       int    `json:"port"`
	AdminPwd   string `json:"admin_pwd"`
	BlackMost  int    `json:"black_most"`
	HttpsPort  int    `json:"https_port"`
	PublicKey  string `json:"public_key"`
	PrivateKey string `json:"private_key"`
	NodeBin    string `json:"node_bin"`
}

type AttachedTo struct {
	Name   string `json:"name"`
	Number string `json:"number"`
	Period string `json:"period"`
	Speak  string `json:"speak"`
}

const profilePath string = "config.json"
const constantsPath string = "site/shared/constants.json"
const blogRoot string = "site/blog"

func successJSON() map[string]int {
	return map[string]int{
		"result": 0,
	}
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
	http.ServeFile(w, r, src)
}

func homepage(w http.ResponseWriter, r *http.Request) {
	if r.RequestURI != "/" {
		if strings.HasPrefix(r.RequestURI, "/shared/") {
			responseFile(w, r.RequestURI[1:], false, r)
			return
		}
		p := strings.Split(strings.Trim(r.RequestURI, "/"), "/")
		if len(p) >= 1 && p[0] == "blog" {
			blogPage(w, r)
		} else {
			w.WriteHeader(http.StatusNotFound)
			_, err := fmt.Fprintf(w, "没有这样的索引: %s", r.RequestURI)
			checkError(err, r.RemoteAddr)
		}
	} else {
		responseFile(w, "home.html", false, r)
	}
}

func aboutPage(w http.ResponseWriter, r *http.Request) {
	parse, err := url.Parse(r.RequestURI)
	if err == nil && parse != nil {
		if len(parse.Query()) > 0 {
			getCandidates := func() ([]AttachedTo, error) {
				var candidates []AttachedTo
				file, err := os.Open("site/attachedTo.json")
				if err != nil {
					return nil, err
				}
				decoder := json.NewDecoder(file)
				err = decoder.Decode(&candidates)
				_ = file.Close()
				return candidates, err
			}
			switch parse.Query().Get("request") {
			case "get":
				switch parse.Query().Get("what") {
				case "constants":
					responseFile(w, strings.TrimPrefix(constantsPath, "site/"), false, r)
				}
			case "guessAttachedTo":
				buff := new(bytes.Buffer)
				_, err := buff.ReadFrom(r.Body)
				if !checkError(err, r.RemoteAddr) {
					w.WriteHeader(http.StatusBadRequest)
					return
				}
				name := buff.String()

				candidates, err := getCandidates()
				if !checkError(err, r.RemoteAddr) {
					w.WriteHeader(http.StatusNotFound)
					return
				}
				for _, candidate := range candidates {
					if candidate.Name == name {
						_ = json.NewEncoder(w).Encode(map[string]interface{}{"result": 0, "period": candidate.Period})
						return
					}
				}
				err = json.NewEncoder(w).Encode(map[string]int{"result": 1})
				checkError(err, r.RemoteAddr)
			case "guessNumber":
				data := make(map[string]string)
				err = json.NewDecoder(r.Body).Decode(&data)
				if !checkError(err, r.RemoteAddr) {
					w.WriteHeader(http.StatusBadRequest)
					return
				}
				name, number := data["name"], data["number"]
				candidates, err := getCandidates()
				if !checkError(err, r.RemoteAddr) {
					w.WriteHeader(http.StatusNotFound)
					return
				}
				for _, candidate := range candidates {
					if candidate.Name == name {
						var result map[string]interface{}
						if strings.Contains(number, candidate.Number) {
							result = map[string]interface{}{"result": 0, "speak": candidate.Speak}
						} else {
							result = map[string]interface{}{"result": 2}
						}
						_ = json.NewEncoder(w).Encode(result)
						return
					}
				}
				_ = json.NewEncoder(w).Encode(map[string]int{"result": 1})
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
					err = encoder.Encode(successJSON())
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
					w.WriteHeader(http.StatusForbidden)
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
				// WriteToDisk

				file, err = os.Create(constantsPath)
				if !check(err) {
					return
				}
				buff := new(bytes.Buffer)
				encoder := json.NewEncoder(buff)
				err = encoder.Encode(jsonMap)
				if err != nil {
					log.Printf("[manage] Failed to write changes from remote: %s", err)
					w.WriteHeader(http.StatusExpectationFailed)
				} else {
					defer file.Close()
					_, err = file.Write(buff.Bytes())
					if err != nil {
						log.Printf("[manage] Failed to write changes to disk: %s", err)
						w.WriteHeader(http.StatusExpectationFailed)
					} else {
						w.WriteHeader(200)
					}
				}
			case "editor":
				if !isLogin(r) {
					w.WriteHeader(http.StatusForbidden)
					return
				}
				switch parse.Query().Get("operation") {
				case "write":
					var config map[string]interface{}
					err := json.NewDecoder(r.Body).Decode(&config)
					if !checkError(err, r.RemoteAddr) {
						w.WriteHeader(http.StatusBadRequest)
						return
					}
					now := time.Now()
					header := BlogHeader{
						Title:        fmt.Sprint(config["title"]),
						ID:           fmt.Sprint(config["id"]),
						Category:     fmt.Sprint(config["category"]),
						LastModified: now.Unix(),
					}
					tagData := config["tag"].([]interface{})
					tag := make([]string, len(tagData))
					for index, v := range tagData {
						tag[index] = v.(string)
					}
					header.Tag = tag
					existence, _ := getBlog(header.ID)
					if existence != nil {
						// If there has been an existing header for this ID
						// Use it's upload time
						header.UploadTime = existence.UploadTime
					} else {
						// Otherwise, use now as upload time
						header.UploadTime = now.Unix()
					}
					article := fmt.Sprint(config["article"])
					err = header.WriteToDisk(article)
					if err != nil {
						log.Println("Failed to write blog:", err)
						w.WriteHeader(http.StatusExpectationFailed)
						return
					}
					err = json.NewEncoder(w).Encode(successJSON())
					checkError(err, r.RemoteAddr)
				case "nextID":
					id, err := nextBlogID()
					if !checkError(err, r.RemoteAddr) {
						w.WriteHeader(http.StatusExpectationFailed)
						return
					}
					_, err = fmt.Fprint(w, id)
					checkError(err, r.RemoteAddr)
				case "rename":
					old, newID := parse.Query().Get("old"), parse.Query().Get("new")
					if old == "" || newID == "" {
						w.WriteHeader(http.StatusBadRequest)
						return
					}
					old = filepath.Join(blogRoot, old)
					newID = filepath.Join(blogRoot, newID)
					err := os.Rename(old, newID)
					if err != nil {
						log.Println("Failed to rename", old, "to", newID+":", err)
						w.WriteHeader(http.StatusExpectationFailed)
						return
					}
					err = json.NewEncoder(w).Encode(map[string]int{
						"result": 0,
					})
				case "delete":
					id := parse.Query().Get("id")
					if id == "" {
						w.WriteHeader(http.StatusBadRequest)
						return
					}
					err := os.RemoveAll(path.Join(blogRoot, id))
					if err != nil {
						log.Println("Could not delete", id+":", err)
						if os.IsNotExist(err) {
							w.WriteHeader(http.StatusNotFound)
						} else {
							w.WriteHeader(http.StatusExpectationFailed)
						}
						return
					}
					err = json.NewEncoder(w).Encode(successJSON())
					checkError(err, r.RemoteAddr)
				case "upload":
					id, fileName := parse.Query().Get("id"), parse.Query().Get("name")
					if id == "" || fileName == "" {
						w.WriteHeader(http.StatusBadRequest)
						return
					}
					dir := filepath.Join(blogRoot, id)
					_, err := os.Stat(dir)
					if err != nil && os.IsNotExist(err) {
						err = os.MkdirAll(dir, os.ModePerm)
						if err != nil {
							w.WriteHeader(http.StatusForbidden)
							return
						}
					}
					f := filepath.Join(dir, fileName)
					file, err := os.Create(f)
					if err != nil {
						log.Println("Failed to create file at", f+":", err)
						w.WriteHeader(http.StatusExpectationFailed)
						return
					}
					_, err = io.Copy(file, r.Body)
					if !checkError(err, r.RequestURI) {
						log.Println("Could not write", f+":", err)
						w.WriteHeader(http.StatusExpectationFailed)
					}
					err = file.Close()
					if err != nil {
						log.Println("Failed to close", f+":", err)
						w.WriteHeader(http.StatusExpectationFailed)
					}
					err = json.NewEncoder(w).Encode(successJSON())
					checkError(err, r.RemoteAddr)
				case "attachment":
					id := parse.Query().Get("id")
					if id == "" {
						w.WriteHeader(http.StatusBadRequest)
						return
					}
					attachments := make([]string, 0)
					err := filepath.Walk(filepath.Join(blogRoot, id), func(p string, info os.FileInfo, err error) error {
						if p == blogRoot || blogFileBlackList(info.Name()) {
							return nil
						}
						if !info.IsDir() {
							attachments = append(attachments, info.Name())
						}
						return nil
					})
					if err != nil {
						w.WriteHeader(http.StatusExpectationFailed)
						return
					}
					err = json.NewEncoder(w).Encode(attachments)
					checkError(err, r.RemoteAddr)
				default:
					responseFile(w, "blogEdit.html", false, r)
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

type BlogHeader struct {
	Title        string   `json:"title"`
	ID           string   `json:"id"`
	Category     string   `json:"category"`
	Tag          []string `json:"tag"`
	UploadTime   int64    `json:"upload_time"`
	LastModified int64    `json:"last_modified"`
}

func (header BlogHeader) WriteToDisk(article string) error {
	err := os.MkdirAll(path.Join(blogRoot, header.ID), os.ModePerm)
	if err != nil {
		log.Println("Could not mkdir for", header.ID+":", err)
		return err
	}
	hPath, cPath := path.Join(blogRoot, header.ID, "header.json"), path.Join(blogRoot, header.ID, "content.md")
	hFile, err := os.Create(hPath)
	if err != nil {
		log.Println("Could not open header for", header.ID+":", err)
		return err
	}
	h := map[string]interface{}{
		"title":         header.Title,
		"category":      header.Category,
		"tag":           header.Tag,
		"upload_time":   header.UploadTime,
		"last_modified": header.LastModified,
	}
	err = json.NewEncoder(hFile).Encode(h)
	if err != nil {
		return err
	}
	cFile, err := os.Create(cPath)
	if err != nil {
		return err
	}
	_, err = io.WriteString(cFile, article)
	if err != nil {
		return err
	}
	// Render Markdown
	err = header.RenderMarkdown()
	if err != nil {
		return err
	}
	return nil
}

func (header BlogHeader) RenderMarkdown() error {
	rPath := path.Join(blogRoot, header.ID, "rendered.html")
	render := exec.Command(profile.NodeBin + "/node")
	render.Args = append(render.Args, "render.js")
	render.Env = []string{"RENDER_TARGET=" + path.Join(blogRoot, header.ID)}
	rendered, err := render.CombinedOutput()
	if err != nil {
		buff := bytes.NewBuffer(rendered)
		fmt.Println(buff.String())
		return err
	}
	rFile, err := os.Create(rPath)
	if err != nil {
		return err
	}
	_, err = rFile.Write(rendered)
	if err != nil {
		return err
	}
	_ = rFile.Close()
	return nil
}

func nextBlogID() (string, error) {
	sha := sha1.New()
	_, err := fmt.Fprint(sha, strconv.FormatInt(time.Now().UnixNano(), 10))
	if err != nil {
		return "", err
	}
	sum := sha.Sum(nil)
	result := ""
	for _, v := range sum {
		c := uint(v)%62 + 48
		if c >= 58 {
			c += 7
			if c >= 91 {
				c += 6
			}
		}
		result += string(c)
	}
	return result, nil
}
func listBlog() ([]BlogHeader, error) {
	headers := make([]BlogHeader, 0)
	err := filepath.Walk(blogRoot, func(p string, info os.FileInfo, err error) error {
		if info != nil && info.IsDir() && p != blogRoot {
			header, _ := getBlog(info.Name())
			if header != nil {
				headers = append(headers, *header)
			}
		}
		return nil
	})
	return headers, err
}
func getBlog(id string) (*BlogHeader, error) {
	var header BlogHeader
	joint := path.Join(blogRoot, id, "header.json")
	file, err := os.Open(joint)
	if err != nil {
		log.Println("Could not open", joint+":", err)
		return nil, err
	}
	err = json.NewDecoder(file).Decode(&header)
	if err != nil {
		log.Println("Could not decode json for", joint+":", err)
		return nil, err
	}
	header.ID = id
	return &header, nil
}

func blogPage(w http.ResponseWriter, r *http.Request) {
	if len(r.URL.Query()) > 0 {
		switch r.URL.Query().Get("request") {
		case "list":
			headers, err := listBlog()
			if !checkError(err, r.RemoteAddr) {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			err = json.NewEncoder(w).Encode(headers)
			if !checkError(err, r.RemoteAddr) {
				w.WriteHeader(http.StatusExpectationFailed)
				return
			}
			checkError(err, r.RemoteAddr)
		case "header":
			id := r.URL.Query().Get("id")
			if id == "" {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			header, err := getBlog(id)
			if err != nil || header == nil {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			err = json.NewEncoder(w).Encode(header)
			checkError(err, r.RemoteAddr)
		}
		return
	}
	split := strings.Split(strings.Trim(r.RequestURI, "/"), "/")
	if len(split) > 1 {
		if len(split) == 2 {
			if strings.HasSuffix(r.RequestURI, "/") {
				responseFile(w, filepath.Join("blog", split[1], "rendered.html"), false, r)
			} else {
				redirect(r.RequestURI+"/")(w, r)
			}
			return
		} else if blogFileBlackList(split[2]) {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		responseFile(w, filepath.Join("blog", split[1], split[2]), false, r)
		return
	}
	responseFile(w, "blog.html", false, r)
}

func blogFileBlackList(name string) bool {
	return name == "header.json" || name == "rendered.html"
}

func opencraftPage(w http.ResponseWriter, r *http.Request) {
	responseFile(w, "opencraft.html", false, r)
}

func redirect(uri string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "https://"+r.Host+r.URL.String()+uri, http.StatusMovedPermanently)
	}
}

var profile Profile

func main() {
	log.Printf("Reading profile at %s", profilePath)

	fallback := func() {
		log.Println("Falling back.")
		profile = Profile{
			Port:      3000,
			AdminPwd:  "qwerty",
			HttpsPort: -1,
		}
	}
	startServer := func() {
		blacklist = make(map[string]int)
		registeredManager = make(map[uuid.UUID]time.Time)
		log.Println("Admin password is", profile.AdminPwd)
		http.HandleFunc("/", homepage)
		http.HandleFunc("/about", aboutPage)
		http.HandleFunc("/manage", managePage)
		http.HandleFunc("/settings", settingsPage)
		http.HandleFunc("/blog", blogPage)
		http.HandleFunc("/opencraft", opencraftPage)
		// Process markdown render
		for _, v := range os.Environ() {
			if v == "RERENDER_MARKDOWN=true" {
				headers, err := listBlog()
				if err != nil {
					log.Println("Failed to render markdown:", err)
					break
				}
				for _, h := range headers {
					err = h.RenderMarkdown()
					if err != nil {
						log.Println("Failed to render markdown for", h.ID+":", err)
					}
				}
				break
			}
		}

		if profile.HttpsPort != -1 {
			log.Println("HTTPS listen on port", profile.HttpsPort)
			go http.ListenAndServe(":"+strconv.FormatInt(int64(80), 10), redirect(""))
			log.Fatal(http.ListenAndServeTLS(":"+strconv.FormatInt(int64(profile.HttpsPort), 10), profile.PublicKey, profile.PrivateKey, nil))
		} else {
			log.Println("Listen on port", profile.Port)
			log.Fatal(http.ListenAndServe(":"+strconv.FormatInt(int64(profile.Port), 10), nil))
		}
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
