# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Changed `data` property to be optional as long as `T` is not defined

### Fixed
- Error when calling `current()` on last image after it got deleted and before the index got updated to the previous image.

## [0.1.4] - 2021-10-04
### Fixed
- Fixed double click to zoom on images while body is scrolled down.

## [0.1.3] - 2021-10-04
### Added
- Added option for different image sources.

## [0.1.2] - 2021-10-03
### Added
- Added left/right arrow key navigation.
- Added double-tap to zoom images to their actual size (or zoom out if already zoomed in).

### Changed
- Set `z-index` of image viewer to `9999`.
- Lazy load images (except active and adjacent ones).

### Fixed
- Prevent further interactions during the close animation.
- Fixed Escape key press to close image viewer.

## [0.1.1] - 2021-10-01
### Fixed
- Update image viewer when window gets resized.

## [0.1.0] - 2021-10-01
### Added
- Initial release.

[Unreleased]: https://github.com/rkusa/react-image-viewer-hook/compare/0.1.4...HEAD
[0.1.2]: https://github.com/rkusa/react-image-viewer-hook/releases/tag/0.1.3...0.1.4
[0.1.2]: https://github.com/rkusa/react-image-viewer-hook/releases/tag/0.1.2...0.1.3
[0.1.2]: https://github.com/rkusa/react-image-viewer-hook/releases/tag/0.1.1...0.1.2
[0.1.1]: https://github.com/rkusa/react-image-viewer-hook/releases/tag/0.1.0...0.1.1
[0.1.0]: https://github.com/rkusa/react-image-viewer-hook/releases/tag/0.1.0
