const { Canvas, createCanvas, Image, ImageData, loadImage } = require('canvas');
const { JSDOM } = require('jsdom');
const { writeFileSync, existsSync, statSync } = require('fs');



module.exports = async (file, name = "output.jpg", type = "image/jpeg", quality = 0.95, factor = 1, trainingSet = "./node_modules/opencv-facecrop/resources/haarcascade_frontalface_default.xml") => {
  let image, src, gray, faces, faceCascade;
  try {
    if (factor <= 0)
        throw new Error('Error: Scaling Factor passed is too low, should be greater than 0.');

    await loadOpenCV().catch((e) => { throw new Error("Error: Loading OpenCV failed.\n" + e.message) });
    // console.log("Loading file...");
    image = await loadImage(file)
      .catch((e) => { throw new Error("Error: Loading input image failed.\n" + e.message) });
    if (image != null)
      src = cv.imread(image);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    faces = new cv.RectVector();
    faceCascade = new cv.CascadeClassifier();

    // console.log("Loading pre-trained classifier files...");

    try {
      statSync(trainingSet);
    }
    catch (err) {
      throw new Error("Error: Pre-Trained Classifier file failed to load.\n" + err.message);
    }

    faceCascade.load(trainingSet);

    console.log("Processing...");
    let mSize = new cv.Size(0, 0);
    faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, mSize, mSize);

    let point1, point2;

    const faceBuffers = [];

    for (let i = 0; i < faces.size(); ++i) {
    //   if( i < (faces.size() -1 ) ){
    //     continue;
    //     //only use last image
    //   }
      point1 = new cv.Point(faces.get(i).x, faces.get(i).y);
      point2 = new cv.Point(faces.get(i).x + faces.get(i).width, faces.get(i).y + faces.get(i).height);

      let offset = Math.floor(faces.get(i).width * (factor - 1));//get offset pixels from factor, width=height

      // console.log([point1,point2]);
      // console.log("offset set to"+offset);

      if(point1.x < offset){
        offset = point1.x;
        // console.log("offset adjusted to "+offset);
      }

      if(point1.y < offset){
        offset = point1.y;
        // console.log("offset adjusted to "+offset);
      }

      if(image.height < (point2.y + offset)){
        offset = image.height - point2.y;
        // console.log("offset2 adjusted to "+offset);
      }

      if(image.width < (point2.x + offset)){
        offset = image.width - point2.x;
        // console.log("offset2 adjusted to "+offset);
      }

      point1.x = point1.x - offset;
      point1.y = point1.y - offset;

      point2.x = point2.x + offset;
      point2.y = point2.y + offset;

      // console.log([point1,point2]);      

      const canvas = createCanvas(point2.x - point1.x, point2.y - point1.y);

      let rect = new cv.Rect(point1.x, point1.y, point2.x - point1.x, point2.y - point1.y);

      console.log('Rendering output image...');
      let dst = src.roi(rect);

      console.log("Source File dimension: " + src.size().width + "x" + src.size().height);
      console.log("Destination File dimension: " + dst.size().width + "x" + dst.size().height);

      cv.imshow(canvas, dst);

      let outputFilename = name.toString();

      if (faces.size() > 1) {
        let name = outputFilename.replace(/\.[^/.]+$/, "");
        outputFilename = outputFilename.replace(name, name + `-${i+1}`);        
      }

      console.log(outputFilename + " created successfully.");
      faceBuffers.push(canvas.toBuffer(type, { quality: quality }));
      
    }
    return faceBuffers;
  }
  catch (e) {
    console.error(e.message);
    return e.message;
  }
  finally {
    if (src) src.delete();
    if (gray) gray.delete();
    if (faceCascade) faceCascade.delete();
    if (faces) faces.delete();
  }
};

/**
 * Loads opencv.js.
 *
 * Installs HTML Canvas emulation to support `cv.imread()` and `cv.imshow`
 *
 * Mounts given local folder `localRootDir` in emscripten filesystem folder `rootDir`. By default it will mount the local current directory in emscripten `/work` directory. This means that `/work/foo.txt` will be resolved to the local file `./foo.txt`
 * @param {string} rootDir The directory in emscripten filesystem in which the local filesystem will be mount.
 * @param {string} localRootDir The local directory to mount in emscripten filesystem.
 * @returns {Promise} resolved when the library is ready to use.
 */
function loadOpenCV(rootDir = '/work', localRootDir = process.cwd()) {
  if (global.Module && global.Module.onRuntimeInitialized && global.cv && global.cv.imread) {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    installDOM()
    global.Module = {
      onRuntimeInitialized() {
        // We change emscripten current work directory to 'rootDir' so relative paths are resolved
        // relative to the current local folder, as expected
        cv.FS.chdir(rootDir)
        resolve()
      },
      preRun() {
        // preRun() is another callback like onRuntimeInitialized() but is called just before the
        // library code runs. Here we mount a local folder in emscripten filesystem and we want to
        // do this before the library is executed so the filesystem is accessible from the start
        const FS = global.Module.FS
        // create rootDir if it doesn't exists
        if (!FS.analyzePath(rootDir).exists) {
          FS.mkdir(rootDir);
        }
        // create localRootFolder if it doesn't exists
        if (!existsSync(localRootDir)) {
          mkdirSync(localRootDir, { recursive: true });
        }
        // FS.mount() is similar to Linux/POSIX mount operation. It basically mounts an external
        // filesystem with given format, in given current filesystem directory.
        FS.mount(FS.filesystems.NODEFS, { root: localRootDir }, rootDir);
      }
    };
    global.cv = require('opencv4js')
  });
}
function installDOM() {
  const dom = new JSDOM();
  global.document = dom.window.document;
  global.Image = Image;
  global.HTMLCanvasElement = Canvas;
  global.ImageData = ImageData;
  global.HTMLImageElement = Image;
}