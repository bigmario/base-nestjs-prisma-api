import {
  Controller,
  Request,
  Post,
  Get,
  Delete,
  UseGuards,
  Body,
} from '@nestjs/common';

import { LocalAuthGuard } from '@auth/guards/local-auth.guard';
import { AuthService } from '@auth/services/auth.service';

import {
  AUTH_BASE_ROUTE,
  AUTH_LOGIN_ROUTE,
  AUTH_TEST_ROUTE,
  AUTH_LOGOUT_ROUTE,
  AUTH_PASSWORD_RECOVERY,
  AUTH_RESET_PASSWORD,
} from '@auth/constants/routes.const';

import { Public } from '@auth/decorators/public.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoginDto } from '@auth/dto/login.dto';
import { IRequest } from '@auth/interfaces/express';
import { RecoveryDto, ResetPassDto } from '@auth/dto/recovery.dto';

@ApiTags('Auth')
@Controller(AUTH_BASE_ROUTE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post(AUTH_LOGIN_ROUTE)
  public async login(
    @Request() request: IRequest,
    @Body() body: LoginDto,
  ): Promise<any> {
    return this.authService.login(request.user);
  }

  @ApiBearerAuth()
  @Get(AUTH_TEST_ROUTE)
  public getProfile(@Request() request: IRequest) {
    return request.user;
  }

  @ApiBearerAuth()
  @Delete(AUTH_LOGOUT_ROUTE)
  public logout(@Request() request: IRequest) {
    return this.authService.logout(request);
  }

  @ApiBearerAuth()
  @Get('me')
  public getMyInfo(@Request() request: IRequest) {
    return this.authService.getMyInfo(request.user);
  }

  @Public()
  @Post(AUTH_PASSWORD_RECOVERY)
  public sendRecoveryMail(@Body() recoveryDto: RecoveryDto) {
    return this.authService.sendRecoveryMail(recoveryDto);
  }

  @Public()
  @Post(AUTH_RESET_PASSWORD)
  public resetPassword(@Body() resetPassDto: ResetPassDto) {
    return this.authService.resetPassword(resetPassDto);
  }
}
