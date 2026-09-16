import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Explicit `.ts` extension: `node --test` runs this file directly, and Node's
// ESM resolver does not do extensionless resolution. `apps/web/tsconfig.json`
// sets `allowImportingTsExtensions` for exactly this case. Only this test file
// uses the form — application code imports stay extensionless.
import {
  moveImage,
  removeImage,
  setCoverImage,
} from "./product-gallery-utils.ts";

const IMAGES = ["cover.jpg", "second.jpg", "third.jpg"];

describe("setCoverImage (kapak = images[0])", () => {
  it("seçili görseli başa taşır", async () => {
    assert.deepEqual(setCoverImage(IMAGES, 2), [
      "third.jpg",
      "cover.jpg",
      "second.jpg",
    ]);
  });

  it("zaten kapak olan veya geçersiz indexte diziyi kopyalar", async () => {
    assert.deepEqual(setCoverImage(IMAGES, 0), IMAGES);
    assert.deepEqual(setCoverImage(IMAGES, 9), IMAGES);
    assert.notEqual(setCoverImage(IMAGES, 0), IMAGES);
  });
});

describe("moveImage (yeniden sıralama)", () => {
  it("öğeyi ileri konuma taşır", async () => {
    assert.deepEqual(moveImage(IMAGES, 0, 2), [
      "second.jpg",
      "third.jpg",
      "cover.jpg",
    ]);
  });

  it("öğeyi geri konuma taşır", async () => {
    assert.deepEqual(moveImage(IMAGES, 2, 0), [
      "third.jpg",
      "cover.jpg",
      "second.jpg",
    ]);
  });

  it("sınır dışı hedefi kırpar, geçersiz kaynağı aynen döndürür", async () => {
    assert.deepEqual(moveImage(IMAGES, 1, 99), [
      "cover.jpg",
      "third.jpg",
      "second.jpg",
    ]);
    assert.deepEqual(moveImage(IMAGES, -1, 0), IMAGES);
  });
});

describe("removeImage (silme)", () => {
  it("verilen indexteki görseli kaldırır", async () => {
    assert.deepEqual(removeImage(IMAGES, 0), ["second.jpg", "third.jpg"]);
  });

  it("geçersiz indexte diziyi kopyalar", async () => {
    assert.deepEqual(removeImage(IMAGES, 9), IMAGES);
  });
});
