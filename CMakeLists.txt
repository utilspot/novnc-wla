cmake_minimum_required(VERSION 3.8)
project(novnc-wla VERSION 1.0.0 LANGUAGES C)

include(GNUInstallDirs)

find_program(NPM_EXECUTABLE npm REQUIRED)
mark_as_advanced(NPM_EXECUTABLE)

if (WIN32)
  set(NPM_PREFIX "cmd" "/c")
endif ()

find_package(LibNetQ REQUIRED)

option(NOVNC_INSTALL_SERVER "Install the novnc server" ON)
option(NOVNC_INSTALL_MODULE "Install the novnc module" ON)
option(NOVNC_INSTALL_ASSETS "Install novnc supporting assets" ON)

set(NOVNC_BASE_URL "/" CACHE STRING "URL path prefix the novnc module is served under (a trailing slash is appended if missing)")
set(NOVNC_ROOT_URL "${NOVNC_BASE_URL}")
if(NOT NOVNC_ROOT_URL MATCHES "/$")
  set(NOVNC_ROOT_URL "${NOVNC_ROOT_URL}/")
endif()

set(NOVNC_ENDPOINT "0.0.0.0" CACHE STRING "WebSocket endpoint baked into the client bundle: host[:port][/path], an absolute or relative path, or a full ws(s):// URL. Host 0.0.0.0 (or 0:0:0:0) and an omitted port mean the origin serving the page")
set(NOVNC_ASSETS_DIR "${CMAKE_INSTALL_DATADIR}/${PROJECT_NAME}")

set(NOVNC_DATAFILES
  config.h.in
  )

file(GLOB_RECURSE NOVNC_TSXFILES
  "src/*.ts"
  "src/*.tsx"
  )

set(NOVNC_DISTFILES
  dist/index.html
  dist/manifest.json
  )

add_custom_command(
  COMMAND ${NPM_PREFIX} "${NPM_EXECUTABLE}" install
  COMMAND ${NPM_PREFIX} "${NPM_EXECUTABLE}" run build --base-url=${NOVNC_BASE_URL} --endpoint=${NOVNC_ENDPOINT}
  DEPENDS package.json ${NOVNC_TSXFILES}
  OUTPUT ${NOVNC_DISTFILES}
  WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  )

configure_file(config.h.in "${CMAKE_CURRENT_BINARY_DIR}/config.h" @ONLY)

source_group(TREE "${CMAKE_CURRENT_SOURCE_DIR}" FILES module.c ${NOVNC_DATAFILES} ${NOVNC_DISTFILES})
add_library(novnc_wla SHARED module.c ${NOVNC_DATAFILES} ${NOVNC_DISTFILES})
target_include_directories(novnc_wla PRIVATE "$<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}>")
target_link_libraries(novnc_wla PUBLIC LibNetQ::LibNetQ)
set_property(TARGET novnc_wla PROPERTY POSITION_INDEPENDENT_CODE ON)
set_target_properties(novnc_wla PROPERTIES PREFIX "" IMPORT_PREFIX "")

source_group(TREE "${CMAKE_CURRENT_SOURCE_DIR}" FILES server.c)
add_executable(novnc_server server.c)
target_link_libraries(novnc_server PRIVATE LibNetQ::LibNetQ)

if (CMAKE_C_COMPILER_ID MATCHES "^(GNU|Clang)$")
  target_link_options(novnc_server PRIVATE "-Wl,-rpath,$ORIGIN/../lib")
endif ()

if (NOVNC_INSTALL_SERVER)
  install(TARGETS novnc_server
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    )
endif ()

if (NOVNC_INSTALL_MODULE)
  install(TARGETS novnc_wla
    LIBRARY DESTINATION ${CMAKE_INSTALL_BINDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    )
endif ()

if (NOVNC_INSTALL_ASSETS)
  install(DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/dist/"
    DESTINATION "${NOVNC_ASSETS_DIR}"
    )
endif ()
