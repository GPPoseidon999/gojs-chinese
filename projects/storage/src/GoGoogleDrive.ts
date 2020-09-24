/*
* Copyright (C) 1998-2020 by Northwoods Software Corporation
* All Rights Reserved.
*
* Go Google Drive
*/

// import { Promise } from 'es6-promise';
import * as go from 'gojs';
import * as gcs from './GoCloudStorage.js';

/**
 * Class for saving / loading GoJS {@link Model}s to / from Google Drive.
 * Uses the <a href="https://developers.google.com/drive/v3/reference/">Google Drive V3 API</a> by use of a
 * <a href="https://developers.google.com/api-client-library/javascript/">Google Client</a> API object.
 * As with all {@link GoCloudStorage} subclasses (with the exception of {@link GoLocalStorage}, any page using GoDropBox must be served on a web server.
 *
 * **Note**: Any page using GoGoogleDrive must include a script tag with src set to https://apis.google.com/js/api.js.
 * @category Storage
 */
export class GoGoogleDrive extends gcs.GoCloudStorage {

    private _pickerApiKey: string;
    private _oauthToken: string;
    private _scope: string;
    /**
     * Google Client object
     */
    private _gapiClient: any;
    /**
     * Google Picker object
     */
    private _gapiPicker: any;

    /**
     * @constructor
     * @param {go.Diagram|go.Diagram[]} managedDiagrams An array of GoJS {@link Diagram}s whose model(s) will be saved to / loaded from Google Drive.
     * Can also be a single Diagram.
     * @param {string} clientId The client ID of the Google application linked with this instance of GoGoogleDrive (given in
     * <a href="https://console.developers.google.com">Google Developers Console</a> after registering a Google app)
     * @param {string} pickerApiKey The <a href="https://developers.google.com/picker/">Google Picker</a> API key. Once
     * <a href="https://developers.google.com/picker/docs/">obtained</a>, it can be found in the <a href="https://console.developers.google.com">Google Developers Console</a>
     * @param {string} defaultModel String representation of the default model data for new diagrams. If this is null, default new diagrams will be empty.
     * Usually a value given by calling {@link Model#toJson} on a GoJS Diagram's Model.
     * @param {string} iconsRelativeDirectory The directory path relative to the page in which this instance of GoGoogleDrive exists, in which
     * the storage service brand icons can be found. The default value is "../goCloudStorageIcons/".
     */
    constructor(managedDiagrams: go.Diagram | Array<go.Diagram>, clientId: string, pickerApiKey: string, defaultModel?: string, iconsRelativeDirectory?: string) {
        super(managedDiagrams, defaultModel, clientId, iconsRelativeDirectory);
        this._scope = 'https://www.googleapis.com/auth/drive';
        this._pickerApiKey = pickerApiKey;
        this._oauthToken = null;
        this._gapiClient = null;
        this._gapiPicker = null;
        this.ui.id = 'goGoogleDriveSavePrompt';
        this._serviceName = 'Google Drive';
        this._className = 'GoGoogleDrive';
    }

    /**
     * Get the Google Picker API key associated with this instance of GoGoogleDrive. This is set with a parameter during construction.
     * A Google Picker API key can be obtained by following the process detailed <a href="https://developers.google.com/picker/docs/">here</a>,
     * and it can be found in your <a href="https://console.developers.google.com"> Google Developers Console</a>. The pickerApiKey is used only in {@link #createPicker}.
     * @function.
     * @return {string}
     */
    get pickerApiKey(): string { return this._pickerApiKey; }

    /**
     * Get the scope for the application linked to this instance of GoGoogleDrive (via {@link #clientId}). Scope tells the
     * {@link #gapiClient} what permissions it has in making requests. Read more on scope <a href="https://developers.google.com/drive/v3/web/about-auth">here</a>.
     * The default value is 'https://www.googleapis.com/auth/drive', set during construction. This can only be modified by changing the source code for
     * GoGoogleDrive. As changing scope impacts gapiClient's permissions (and could break the usability of some or all functions of GoGoogleDrive), this is not recommended.
     * @function.
     * @return {string}
     */
    get scope(): string { return this._scope; }

    /**
     * Get Google API Client. The Google API Client is used in GoGoogleDrive to make many different requests to Google Drive, however, it
     * can be used with other Google Libraries to achieve many purposes. To read more about what can be done with a Google API Client object,
     * click <a href="https://developers.google.com/api-client-library/javascript/start/start-js">here</a>. gapiClient is set after a succesful
     * authorization in {@link #authorize}.
     *
     * gapiClient is really of type Object, not type any. However, the Google libraries are all written in JavaScript and do not provide
     * d.ts files. As such, to avoid TypeScript compilation errors, both gapiClient and {@link #gapiPicker} properties are declared as type any.
     * @function.
     * @return {any}
     */
    get gapiClient(): any { return this._gapiClient; }

    /**
     * Get <a href="https://developers.google.com/picker/docs/">Google Picker</a> API Object. Used to show the Google filepicker when loading
     * / deleting files, in the {@link #createPicker} function. gapiPicker is set after a succesful authorization in {@link #authorize}.
     *
     * gapiPicker is really of type Object, not type any. However, the Google libraries are all written in JavaScript and do not
     * provide d.ts files. As such, to avoid TypeScript compilation errors, both {@link #gapiClient} and gapiPicker properties are declared as type any.
     * @function.
     * @return {any}
     */
    get gapiPicker(): any { return this._gapiPicker; }

    /**
     * Check if there is a signed in user who has authorized the application connected to this instance of GoGoogleDrive (via {@link #clientId}.
     * If not, prompt user to sign into their Google Account and authorize the application. On successful authorization, set {@link #gapiClient} and {@link #gapiPicker}.
     * @param {boolean} refreshToken Whether to get a new token (change current Google User)(true) or attempt to fetch a token for the currently signed in Google User (false).
     * @return {Promise<boolean>} Returns a Promise that resolves with a boolean stating whether authorization was succesful (true) or failed (false)
     */
    public authorize(refreshToken: boolean = false) {
        const storage = this;
        let gapi = null;
        if (window['gapi']) gapi = window['gapi'];
        else return;
        if (refreshToken) {
            const href: string = document.location.href;
            document.location.href = 'https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=' + href;
        }
        return new Promise(function(resolve: Function, reject: Function) {
            function auth() {
                gapi.auth.authorize({
                    'client_id': storage.clientId,
                    'scope': storage.scope,
                    'immediate': false
                }, function(authResult) {
                    if (authResult && !authResult.error) {
                        storage._oauthToken = authResult.access_token;
                    }
                    storage._gapiClient = gapi.client;
                    if (window['google']) storage._gapiPicker = window['google']['picker'];
                    resolve(true);
                });
            }
            gapi.load('client:auth', auth);
            gapi.load('picker', {});
        });
    }

    /**
     * Launch <a href="https://developers.google.com/picker/docs/">Google Picker</a>, a filepicker UI used to graphically select files in
     * Google Drive to load or delete. This is accomplished with {@link #gapiPicker}, which is set after succesful authorization, so this
     * function may only be called after a successful call to {@link #authorize}.
     * @param {Function} cb Callback function that takes the chosen file from the picker as a parameter
     */
    public createPicker(cb: Function) {
        const storage = this;
        if (storage._oauthToken) {
            // (appId is just the first number of clientId before '-')
            const appId = storage.clientId.substring(0, this.clientId.indexOf('-'));
            const view = new storage.gapiPicker.View(storage.gapiPicker.ViewId.DOCS);
            view.setMimeTypes('application/json');
            view.setQuery('*.diagram');
            const picker = new storage.gapiPicker.PickerBuilder()
                .enableFeature(storage.gapiPicker.Feature.NAV_HIDDEN)
                .enableFeature(storage.gapiPicker.Feature.MULTISELECT_ENABLED)
                .setAppId(appId)
                .setOrigin(window.location.protocol + '//' + window.location.host)
                .setOAuthToken(storage._oauthToken)
                .addView(view)
                .setDeveloperKey(storage.pickerApiKey)
                .setCallback(function(args) {
                    cb(args);
                })
                .build();
            picker.setVisible(true);
        }
    }

    /**
     * Get <a href="https://developers.google.com/drive/v3/reference/about#resource">information</a> about the
     * currently logged in Google user. Some fields of particular note include:
     *   - displayName
     *   - emailAdrdress
     *   - kind
     * @return {Promise} Returns a Promise that resolves with information about the currently logged in Google user
     */
    public getUserInfo() {
        const storage = this;
        return new Promise(function(resolve: Function, reject: Function) {
            const request = storage.gapiClient.request({
                'path': '/drive/v3/about',
                'method': 'GET',
                'params': { 'fields': 'user' },
                callback: function(resp) {
                    if (resp) resolve(resp.user);
                    else reject(resp);
                }
            });
        });
    }

    /**
     * Get the Google Drive file reference object at a given path. Fields include:
     *   - id: The Google Drive-given ID of the file at the provided path
     *   - name: The name of the file saved to Google Drive at the provided path
     *   - mimeType: For diagram files, this will always be `text/plain`
     *   - kind: This will usually be `drive#file`.
     *
     * **Note:** Name, ID, and path values are requisite for creating valid {@link DiagramFile}s. When creating a DiagramFile for a
     * diagram saved to Google Drive, provide the same value for name and path properties.
     * @param {string} path A valid GoogleDrive file ID -- not a path. Named 'path' only to preserve system nomenclature
     * @return {Promise} Returns a Promise that resolves with a Google Drive file reference object at a given path
     */
    public getFile(path: string) {
        const storage = this;
        return new Promise(function(resolve: Function, reject: Function) {
            const req = storage.gapiClient.request({
                path: '/drive/v3/files/' + path,
                method: 'GET',
                callback: function(resp) {
                    if (!resp.error) {
                        resolve(resp);
                    } else {
                        reject(resp.error);
                    }
                }
            });
        });
    }

    /**
     * Check whether a file exists at a given path
     * @param {string} path A valid GoogleDrive file ID -- not a path. Named 'path' only to preserve system nomenclature
     * @return {Promise} Returns a Promise that resolves with a boolean stating whether a file exists at a given path
     */
    public checkFileExists(path: string) {
        const storage = this;
        return new Promise(function(resolve: Function, reject: Function) {
            const req = storage.gapiClient.request({
                path: '/drive/v3/files/' + path,
                method: 'GET',
                callback: function(resp) {
                    const bool = (!!resp);
                    resolve(bool);
                }
            });
        });
    }

    /**
     * Show the custom GoGoogleDrive save prompt; a div with an HTML input element that accepts a file name to save the current {@link #managedDiagrams}
     * data to in Google Drive.
     * @return {Promise} Returns a Promise that resolves (in {@link #save}, {@link #load}, or {@link #remove}) with a {@link DiagramFile} representing the saved/loaded/deleted file
     */
    public showUI() {
        const storage = this;
        const ui = storage.ui;
        ui.innerHTML = ''; // clear div
        ui.style.visibility = 'visible';

        ui.innerHTML = "<img class='icons' src='" + storage.iconsRelativeDirectory + "googleDrive.jpg'></img><strong>Save Diagram As</strong><hr></hr>";
        // user input div
        const userInputDiv: HTMLElement = document.createElement('div');
        userInputDiv.id = 'userInputDiv';
        userInputDiv.innerHTML += '<input id="userInput" placeholder="Enter filename"></input>';
        ui.appendChild(userInputDiv);

        const submitDiv: HTMLElement = document.createElement('div');
        submitDiv.id = 'submitDiv';
        const actionButton = document.createElement('button');
        actionButton.id = 'actionButton';
        actionButton.textContent = 'Save';
        actionButton.onclick = function() {
            storage.saveWithUI();
        };
        submitDiv.appendChild(actionButton);
        ui.appendChild(submitDiv);

        const cancelDiv: HTMLElement = document.createElement('div');
        cancelDiv.id = 'cancelDiv';
        const cancelButton = document.createElement('button');
        cancelButton.id = 'cancelButton';
        cancelButton.textContent = 'Cancel';
        cancelButton.onclick = function() {
            storage.hideUI(true);
        };
        cancelDiv.appendChild(cancelButton);
        ui.appendChild(cancelDiv);

        return storage._deferredPromise.promise;
    }

    /**
     * Save the current {@link #managedDiagrams}'s model data to the current Google user's Google Drive using the custom {@link #ui} save prompt.
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the saved file
     */
    public saveWithUI() {
        const storage = this;
        const ui = storage.ui;
        return new Promise(function(resolve: Function, reject: Function) {
            if (ui.style.visibility === 'hidden') {
                resolve(storage.showUI());
            } else {
                const saveName: string = (document.getElementById('userInput') as HTMLInputElement).value;
                storage.save(saveName);
                resolve(storage.hideUI());
            }
        });
    }

    /**
     * Save {@link #managedDiagrams}' model data to GoGoogleDrive. If path is supplied save to that path. If no path is supplied but {@link #currentDiagramFile} has non-null,
     * valid properties, update saved diagram file content at the path in GoGoogleDrive corresponding to currentDiagramFile.path with current managedDiagrams' model data.
     * If no path is supplied and currentDiagramFile is null or has null properties, this calls {@link #saveWithUI}.
     * @param {string} path A name (not a path, not an id) to save this diagram file in Google Drive under. Named 'path' only to preserve system nomenclature
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the saved file
     */
    public save(path?: string) {
        const storage = this;
        return new Promise(function(resolve: Function, reject: Function) {
            if (path) { // save as
                if (path.indexOf('.diagram') === -1) path += '.diagram';
                let overwrite: boolean = false;
                let overwriteFile: Object = null;
                // get saved diagrams
                const request = storage.gapiClient.request({
                    'path': '/drive/v3/files',
                    'method': 'GET',
                    'params': { 'q': 'trashed=false and name contains ".diagram" and mimeType = "application/json"' },
                    callback: function(resp) {
                        const savedDiagrams: Array<Object> = resp.files;
                        if (savedDiagrams) {
                            for (let i = 0; i < savedDiagrams.length; i++) {
                                if (savedDiagrams[i]['name'] === path) {
                                    overwrite = true;
                                    overwriteFile = savedDiagrams[i];
                                }
                            }
                        }

                        const boundary = '-------314159265358979323846';
                        const delimiter = '\r\n--' + boundary + '\r\n';
                        const closeDelim = '\r\n--' + boundary + '--';
                        const contentType = 'application/json';

                        const metadata: Object = {
                            'name': path,
                            'mimeType': contentType
                        };

                        const data = storage.makeSaveFile();

                        const multipartRequestBody: string =
                            delimiter +
                            'Content-Type: application/json\r\n\r\n' +
                            JSON.stringify(metadata) +
                            delimiter +
                            'Content-Type: ' + contentType + '\r\n\r\n' +
                            data +
                            closeDelim;

                        const req = storage.gapiClient.request({
                            'path': '/upload/drive/v3/files',
                            'method': 'POST',
                            'params': { 'uploadType': 'multipart' },
                            'headers': {
                                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                            },
                            'body': multipartRequestBody
                        });
                        req.execute(function(response) {
                            const savedFile: gcs.DiagramFile = { name: response.name, id: response.id, path: response.name };
                            storage.currentDiagramFile = savedFile;
                            resolve(savedFile); // used if save was called without UI

                            // if save has been called in saveDiagramWithUI, need to resolve / reset the Deferred Promise instance variable
                            storage._deferredPromise.promise.resolve(savedFile);
                            storage._deferredPromise.promise = storage.makeDeferredPromise();
                        });
                    }
                });
            } else if (storage.currentDiagramFile.path) { // save
                const fileId: string = storage.currentDiagramFile.id;
                const saveFile: string = storage.makeSaveFile();
                storage.gapiClient.request({
                    path: '/upload/drive/v3/files/' + fileId,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    body: saveFile,
                    callback: function(resp) {
                        if (!resp.error) {
                            // successful save
                            const savedFile: gcs.DiagramFile = { name: resp.name, id: resp.id, path: resp.name };
                            resolve(savedFile);
                        } else if (resp.error.code === 401) {
                            storage.authorize(true);
                        }
                    }
                });
            } else {
                resolve(storage.saveWithUI());  // must use UI prompt to get a name if no 'path' is provided
            }
        });
    }

    /**
     * Load the contents of a saved diagram from Google Drive using the Google Picker (see {@link #gapiPicker} and {@link #createPicker}).
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the loaded file
     */
    public loadWithUI() {
        const storage = this;
        return new Promise(function(resolve: Function, reject: Function) {
            const loadFunction: Function = function(data) {
                if (data.action === 'picked') {
                    const file = data.docs[0];
                    storage.gapiClient.request({
                        'path': '/drive/v3/files/' + file.id + '?alt=media',
                        'method': 'GET',
                        callback: function(modelData) {
                            if (file.name.indexOf('.diagram') !== -1) {
                                const loadedFile = { name: file.name, path: file.name, id: file.id };
                                resolve(storage.load(file.id));
                                storage.currentDiagramFile = loadedFile;
                            }
                        }
                    });
                }
            };

            storage.createPicker(loadFunction); // TODO
        });
    }

    /**
     * Get the contents of a saved diagram from Google Drive using a given Google Drive file ID. No UI of any sort appears.
     * @param {string} path A valid GoogleDrive file ID -- not a path. Named 'path' only to preserve GoCloudStorage system nomenclature
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the loaded file
     */
    public load(path: string) {
        const storage = this;
        return new Promise(function(resolve: Function, reject: Function) {
            storage.getFile(path).then(function(file: any) {
                storage.gapiClient.request({
                    'path': '/drive/v3/files/' + file.id + '?alt=media',
                    'method': 'GET',
                    callback: function(modelData) {
                        if (modelData) {
                            if (file.name.indexOf('.diagram') !== -1) {
                                storage.loadFromFileContents(JSON.stringify(modelData));
                                const loadedFile: gcs.DiagramFile = { name: file['name'], path: file['name'], id: file['id'] };
                                storage.currentDiagramFile = loadedFile;
                                resolve(loadedFile);
                            }
                        }
                    }
                });
            }).catch(function(e) {
                reject(e.message);
            });
        });
    }

    /**
     * Delete a selected diagram from a user's Google Drive using the Google Picker (see {@link #gapiPicker} and {@link #createPicker}).
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the deleted file
     */
    public removeWithUI() {
        const storage = this;
        return new Promise(function(resolve: Function, reject: Function) {
            const deleteFunction = function(data: Object) {
                if (data['action'] === 'picked') {
                    const file = data['docs'][0];
                    resolve(storage.remove(file.id));
                }
            };
            storage.createPicker(deleteFunction);
        });
    }

    /**
     * Delete a the diagram from a user's Google Drive with the given Google Drive file ID. No UI of any sort appears.
     * @param {string} path A valid GoogleDrive file ID -- not a path. Named 'path' only to preserve system nomenclature
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the deleted file
     */
    public remove(path: string) {
        const storage = this;
        return new Promise(function(resolve: Function, reject: Function) {
            storage.getFile(path).then(function(deletedFile: Object) {
                storage.gapiClient.request({
                    'path': 'drive/v3/files/' + path,
                    'method': 'DELETE',
                    callback: function() {
                        if (storage.currentDiagramFile && path === storage.currentDiagramFile.id) storage.currentDiagramFile = { name: null, path: null, id: null };
                        deletedFile['path'] = deletedFile['name']; // google drive file references don't include path
                        resolve(deletedFile);
                    }
                });
            }).catch(function(e) {
                reject(e.message);
            });
        });
    }
}
