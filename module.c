#include "config.h"

#include <libnetq/Library.h>
#include <libnetq/fs/Path.h>
#include <libnetq/ErrorCode.h>
#include <libnetq/http/HttpHeader.h>
#include <libnetq/http/MediaType.h>
#include <libnetq/Module.h>
#include <libnetq/json/JSONWriter.h>
#include <libnetq/web/WebRequest.h>
#include <libnetq/web/WebResponse.h>
#include <libnetq/Assert.h>

#include <libnetq/Array.h>
#include <libnetq/web/WebServer.h>
#include <libnetq/web/WebManifest.h>

typedef struct WebNoVNCExecutor WebNoVNCExecutor;
struct WebNoVNCExecutor {
  NQWebExecutor executor;
  NQWebManifestListeners manifestListeners;
};

static int executorInit(NQWebExecutor* executor, void* data)
{
  NQ_UNUSED_PARAM(data);

  struct WebNoVNCExecutor* novnc = (struct WebNoVNCExecutor*)executor;

  NQLibraryInfo info;
  int ret = NQLibraryInfoLoad(&info, &executorInit);
  if (ret != 0)
    return ret;

  NQPath* manifest = NQPath_join3(info.filename, "../../" NOVNC_ASSETS_DIR, NQ_WEBMANIFEST_FILE);
  NQLibraryInfoFinalize(&info);
  if (manifest == NULL) {
    return -NQ_ENOMEM;
  }

  ret = NQWebManifestListenersInit(executor, &novnc->manifestListeners, NQPath_characters(manifest));
  NQPath_destroy(manifest);
  if (ret != 0) {
    return ret;
  }

  return ret;
}

static void executorRelease(NQWebExecutor* executor)
{
  struct WebNoVNCExecutor* novnc = (struct WebNoVNCExecutor*)executor;
  NQWebManifestListenersFinalize(&novnc->executor, &novnc->manifestListeners);
}

static struct NQWebExecutorOperations s_executorOps = {
  .name = "novnc",
  .init = executorInit,
  .release = executorRelease,
  .size = sizeof(struct WebNoVNCExecutor),
};

static int moduleInit(NQContext* context)
{
  NQWebExecutorRegister(&s_executorOps);
  return 0;
}

static void moduleExit(NQContext* context)
{
  NQWebExecutorUnregister(&s_executorOps);
}

NQ_MODULE_INIT(moduleInit);
NQ_MODULE_EXIT(moduleExit);
