## Table of Contents

* Function Summary
* Function Details
  * custom(...)
  * delete(...)
  * get(...)
  * head(...)
  * post(...)
  * put(...)

# Web Request Manager {#web-request-manager}

`WebRequest` is a static global class which allows you to send HTTP web request, from the game host's computer only.
> **Note: Note**
> This is an advanced feature that allows you to send and receive data to/from web services. You could, for example,
> provide a companion web server for your game which has a persistent database.
>
## Function Summary {#function-summary}

|Function Name|Return|Description| |
|---|---|---|---|
|custom( ` string ` url, ` string ` method, ` boolean ` download, ` string ` data, ` table ` headers, ` function ` callback_function)|[Web Request Instance](../instance/)|Performs a HTTP request using the specified method, data and headers.|[#custom](#custom)|
|delete( ` string ` url, ` function ` callback_function)|[Web Request Instance](../instance/)|Performs a HTTP DELETE request.| |
|get( ` string ` url, ` function ` callback_function)|[Web Request Instance](../instance/)|Performs a HTTP GET request.|[#get](#get)|
|head( ` string ` url, ` function ` callback_function)|[Web Request Instance](../instance/)|Performs a HTTP HEAD request.| |
|post( ` string ` url, ` variable ` form, ` function ` callback_function)|[Web Request Instance](../instance/)|Performs a HTTP POST request, sending the specified form.|[#post](#post)|
|put( ` string ` url, ` string ` data, ` function ` callback_function)|[Web Request Instance](../instance/)|Performs a HTTP PUT request, sending the specified data.|[#put](#put)|

## Function Details {#function-details}

### custom(...) {#custom}

Performs a HTTP request using the specified method, data and headers. Returns a [Web Request Instance](../instance/).
> **Info: custom(url, method, download, data, headers, callback_function)**
>
> * [../../types/](../../types/) **url**: The URL.
> * [../../types/](../../types/) **method**: The HTTP method.
> * [../../types/](../../types/) **download**: Whether you want to handle the response body. Must be ` true ` if you intend to read the response [text](../instance/#text).
> * [../../types/](../../types/) **data**: The request body.
> * [../../types/](../../types/) **headers**: Table of request headers. The table's keys and values must both be [../../types/](../../types/).
> * [../../types/#function](../../types/#function) **callback_function**: Called when the request completes (or fails). Passed the [Web Request Instance](../instance/).
>
> * Optional, but you will be unable to handle the response (or errors) if unused.
> * Optional, but you will be unable to handle the response (or errors) if unused.
> **Example: Example**
> We're going to make an (intentionally invalid) *attempt*to use Github's APIs to create a Github issue.
> We'll include a JSON request body and some request headers. Once the request completes, we're going to inspect the
> response headers, decode the response, and finally print the reason why our request was denied by Github.
>
> ```lua
> local headers = {
> -- Github's APIs require an Authorization header
> Authorization = "token 5199831f4dd3b79e7c5b7e0ebe75d67aa66e79d4",
> -- We're sending a JSON body in the request
> ["Content-Type"] = "application/json",
> -- We're expecting a JSON body in the response
> Accept = "application/json",
> }
> -- Some JSON data (that represents a new Github issue).
> -- See: https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api#creating-an-issue
> local data = {
> title = "New logo",
> body = "We should have one",
> labels = {"design"}
> }
> -- Encode the data as JSON, so we can send it in our request body.
> local body = JSON.encode(data)
> -- Our request is targeting the Berserk Games API docs Github repository's issues endpoint.
> local url = "https://api.github.com/repos/Berserk-Games/Tabletop-Simulator-API/issues"
> -- Perform the request
> WebRequest.custom(url, "POST", true, body, headers, function(request)
> -- Check if the request failed to complete e.g. if your Internet connection dropped out.
> if request.is_error then
> print("Request failed: ".. request.error)
> return
> end
> -- Check that Github responded with JSON
> local contentType = request.getResponseHeader("Content-Type") or ""
> if contentType ~= "application/json" and not contentType:match("^application/json;") then
> -- We're expecting a JSON response only, if we get something else we'll print an error
> print("Uh oh! Github sent us something we didn't expect.")
> print("Content-Type: ".. contentType)
> return
> end
> print("Request denied with status code: ".. request.response_code)
> -- Decode the JSON response body
> local responseData = JSON.decode(request.text)
> -- When Github denies a request, they include a "message" field in the JSON body to explain. Let's print it.
> print("Reason: ".. responseData.message)
> end)
> ```
>
> ```lua
> local headers = {
> -- Github's APIs require an Authorization header
> Authorization = "token 5199831f4dd3b79e7c5b7e0ebe75d67aa66e79d4",
> -- We're sending a JSON body in the request
> ["Content-Type"] = "application/json",
> -- We're expecting a JSON body in the response
> Accept = "application/json",
> }
> -- Some JSON data (that represents a new Github issue).
> -- See: https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api#creating-an-issue
> local data = {
> title = "New logo",
> body = "We should have one",
> labels = {"design"}
> }
> -- Encode the data as JSON, so we can send it in our request body.
> local body = JSON.encode(data)
> -- Our request is targeting the Berserk Games API docs Github repository's issues endpoint.
> local url = "https://api.github.com/repos/Berserk-Games/Tabletop-Simulator-API/issues"
> -- Perform the request
> WebRequest.custom(url, "POST", true, body, headers, function(request)
> -- Check if the request failed to complete e.g. if your Internet connection dropped out.
> if request.is_error then
> print("Request failed: ".. request.error)
> return
> end
> -- Check that Github responded with JSON
> local contentType = request.getResponseHeader("Content-Type") or ""
> if contentType ~= "application/json" and not contentType:match("^application/json;") then
> -- We're expecting a JSON response only, if we get something else we'll print an error
> print("Uh oh! Github sent us something we didn't expect.")
> print("Content-Type: ".. contentType)
> return
> end
> print("Request denied with status code: ".. request.response_code)
> -- Decode the JSON response body
> local responseData = JSON.decode(request.text)
> -- When Github denies a request, they include a "message" field in the JSON body to explain. Let's print it.
> print("Reason: ".. responseData.message)
> end)
> ```

---

### get(...) {#get}

Performs a HTTP GET request. Returns a [Web Request Instance](../instance/).
> **Info: get(url, callback_function)**
>
> * [../../types/](../../types/) **url**: The URL.
> * [../../types/#function](../../types/#function) **callback_function**: Called when the request completes (or fails). Passed the [Web Request Instance](../instance/).
>
> * Technically optional, but it makes no sense to send a GET request and not handle the response (or errors).
> * Technically optional, but it makes no sense to send a GET request and not handle the response (or errors).
> **Example: Example**
> Broadcast the text returned from Github's "Zen API". If the request fails, log the error.
>
> ```lua
> WebRequest.get("https://api.github.com/zen", function(request)
> if request.is_error then
> log(request.error)
> else
> broadcastToAll(request.text)
> end
> end)
> ```
>
> ```lua
> WebRequest.get("https://api.github.com/zen", function(request)
> if request.is_error then
> log(request.error)
> else
> broadcastToAll(request.text)
> end
> end)
> ```

---

### post(...) {#post}

Performs a HTTP POST request, sending the specified data. Returns a [Web Request Instance](../instance/).
The form will be sent as the body of the request (` Content-Type: application/x-www-form-urlencoded `).
> **Info: post(url, form, callback_function)**
>
> * [../../types/](../../types/) **url**: The URL.
> * [../../types/](../../types/)/ [../../types/](../../types/) **form**: The form to post.
> * [../../types/#function](../../types/#function) **callback_function**: Called when the request completes (or fails). Passed the [Web Request Instance](../instance/).
>
> * Optional, but you will be unable to handle the response (or errors) if unused.
> * Optional, but you will be unable to handle the response (or errors) if unused.
When ` form ` is provided as a [../../types/](../../types/)the data will be URL encoded for you.
The table keys and values must both be [../../types/](../../types/).

---

### put(...) {#put}

Performs a HTTP PUT request, sending the specified data. Returns a [Web Request Instance](../instance/).
The data will be UTF-8 encoded and sent as binary data in the body of the request (`Content-Type: application/octet-stream`).
> **Info: put(url, data, callback_function)**
>
> * [../../types/](../../types/) **url**: The URL.
> * [../../types/](../../types/) **data**: The request body.
> * [../../types/#function](../../types/#function) **callback_function**: Called when the request completes (or fails). Passed the [Web Request Instance](../instance/).
>
> * Optional, but you will be unable to handle the response (or errors) if unused.
> * Optional, but you will be unable to handle the response (or errors) if unused.
