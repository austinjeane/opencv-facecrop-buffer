const facecrop = require('../index');
const { writeFileSync, stat } = require('fs');

test('Single face detection', async () => {
  var buffer = await facecrop('./test/test-file-1.jpg', './test/out.jpg', "image/jpeg", 0.95, 1, './resources/haarcascade_frontalface_default.xml');
  writeFileSync('./test/out.jpg', buffer[0]);
  return expect(isExists1("./test/out.jpg")).toBeTruthy();
});

test('Multiple face detection', async () => {
  var faces = await facecrop('./test/test-file-2.jpg', './test/output.jpg', "image/jpeg", 0.95, 1, './resources/haarcascade_frontalface_default.xml');
  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    writeFileSync(`./test/output-${i}.jpg`, face);
  }
  return expect(isExists2("./test/output-1.jpg", "./test/output-2.jpg")).toBeTruthy();
});

test('Return value', async () => {
  let out = await facecrop('./test/test-file-1.jpg', './test/out.jpg', "image/jpeg", 0.95, 1.1, './resources/haarcascade_frontalface_default.xml');
  return expect(Buffer.isBuffer(out[0])).toBeTruthy();
});

test('Invalid input image parameter', async () => {
  let out = await facecrop('./invalid-file-name');
  return expect(out).toMatch("Error: Loading input image failed");
});

test('Invalid training set path', async () => {
  let out = await facecrop('./test/test-file-1.jpg', './test/out.jpg', "image/jpeg", 0.95);
  return expect(out).toMatch("Pre-Trained Classifier file failed to load.");
  // .rejects
  // .toThrow("no such file or directory, stat './node_modules/opencv-facecrop/resources/haarcascade_frontalface_default.xml'");
});

test('Factor out of bounds', async () => {
  let out = await facecrop('./test/test-file-1.jpg', './test/output.jpg', "image/jpeg", 0.95, -10, './resources/haarcascade_frontalface_default.xml');
  return expect(out).toMatch("Factor passed is too low, should be greater than 0.");
});

async function isExists1(filename) {
  stat(filename, (err) => {
    return err == null ? true : false;
  });
}

async function isExists2(file1, file2) {
  stat(file1, (err1) => {
    if (err1 == null) {
      stat(file2, (err2) => {
        return err2 == null ? true : false;
      });
    }
    else
      return false;
  });
}